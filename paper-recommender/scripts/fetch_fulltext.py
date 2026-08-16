#!/usr/bin/env python
"""Fetch an open-access PDF for a stored paper, section-split it, and index the
passages as chunks.

    python fetch_fulltext.py --doi consensus:1f8588ed2a105d09b037a799608a8d3d
    python fetch_fulltext.py --doi <id> --pdf ./local.pdf   # skip resolution
    python fetch_fulltext.py --doi <id> --dry-run           # extract, don't write

Only open-access sources are attempted (currently arXiv, resolved by title).
Papers whose full text is not reachable simply keep working as abstract-only
records — that is the expected case for a large share of any corpus, not a
failure. Nothing here circumvents a paywall.
"""

import argparse
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

from common import (
    CHUNK_PREFIX,
    KEY_PREFIX,
    embed,
    redis_client,
)

ARXIV_API = "http://export.arxiv.org/api/query"
# arXiv asks for one request per 3 seconds. Slightly over, to be safe.
ARXIV_MIN_INTERVAL = 3.5
ATOM = {"a": "http://www.w3.org/2005/Atom"}

# Canonical buckets. The point of naming sections is that `results` and
# `limitations` are the passages worth filtering to — "what did they find, and
# what did they admit it doesn't show".
#
# Papers rarely use these names verbatim. Real headings look like "Research
# Design and Data Collection" or "Interpretation of Findings", so match on
# substrings and accept that plenty of headings map to nothing. Order matters:
# the first match wins, so more specific buckets are checked first ("Summary of
# Findings" is a conclusion, not a result).
SECTION_KEYWORDS = (
    ("abstract", ("abstract",)),
    ("introduction", ("introduction",)),
    ("limitations", ("limitation", "threats to validity", "threat to validity")),
    ("conclusion", ("conclusion", "concluding", "future work", "summary of", "contribution")),
    ("discussion", ("discussion", "interpretation", "implication", "challenge", "barrier")),
    ("results", ("result", "finding", "evaluation", "experiment", "case study example")),
    ("methods", ("method", "research design", "data collection", "sample selection",
                 "study design", "materials", "framework development", "approach")),
    ("background", ("background", "related work", "literature review", "foundations",
                    "theoretical", "underpinning", "preliminaries")),
)
DEFAULT_SECTION = "body"

# Everything from here on is dropped: it is a third of the token count and
# retrieves as pure noise.
STOP_KEYWORDS = ("references", "bibliography", "acknowledgment", "acknowledgement", "appendix")

# Bold lines that are captions or bolded sentence openers, not headings.
CAPTION_PREFIXES = ("figure", "fig.", "table", "eq.", "equation", "algorithm", "listing")

# Fraction of page height at top and bottom treated as margin, where running
# headers and footers live. Generous on purpose: a header sitting one point
# inside the zone boundary is invisible to the frequency check, and nothing is
# dropped from here unless it also repeats across pages.
MARGIN_FRACTION = 0.12

TARGET_WORDS = 320   # ~400 tokens
OVERLAP_WORDS = 50
MIN_WORDS = 40       # below this a chunk is a stray heading or caption
# nomic-embed-text has a 2048-token window; ~2000 chars stays well inside it
# even for text that tokenizes badly.
MAX_CHARS = 2000


class LookupFailed(Exception):
    """The lookup never completed — distinct from 'this paper isn't on arXiv'.

    Collapsing the two is how a rate-limited sweep silently reports a corpus as
    unavailable. Callers must be able to tell "no" from "don't know".
    """


_last_request = [0.0]


def _throttle():
    """arXiv asks for no more than one request every 3 seconds.

    Enforced here rather than in the caller, so no call site can hammer the
    endpoint by forgetting to sleep.
    """
    elapsed = time.monotonic() - _last_request[0]
    if elapsed < ARXIV_MIN_INTERVAL:
        time.sleep(ARXIV_MIN_INTERVAL - elapsed)
    _last_request[0] = time.monotonic()


def resolve_arxiv_pdf(title, attempts=4):
    """Find an arXiv PDF URL by exact-ish title match.

    Returns None only when arXiv answered and had no matching paper.
    Raises LookupFailed when we never got a usable answer.
    """
    query = urllib.parse.urlencode(
        {"search_query": f'ti:"{title}"', "max_results": 3}
    )
    root = None
    for attempt in range(attempts):
        _throttle()
        try:
            with urllib.request.urlopen(f"{ARXIV_API}?{query}", timeout=60) as resp:
                root = ET.fromstring(resp.read())
            break
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503):
                raise LookupFailed(f"HTTP {e.code}") from e
            backoff = ARXIV_MIN_INTERVAL * (2 ** (attempt + 1))
            print(f"    rate limited, waiting {backoff:.0f}s", file=sys.stderr)
            time.sleep(backoff)
        except Exception as e:
            if attempt == attempts - 1:
                raise LookupFailed(str(e)) from e
            time.sleep(ARXIV_MIN_INTERVAL * (2 ** (attempt + 1)))
    if root is None:
        raise LookupFailed(f"no response after {attempts} attempts")

    wanted = normalize_title(title)
    for entry in root.findall("a:entry", ATOM):
        found = entry.find("a:title", ATOM)
        if found is None or normalize_title(found.text) != wanted:
            continue
        for link in entry.findall("a:link", ATOM):
            if link.get("title") == "pdf":
                return link.get("href")
    return None


def normalize_title(text):
    return re.sub(r"\W+", " ", (text or "").lower()).strip()


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": "paper-recommender/1.0"})
    with urllib.request.urlopen(req, timeout=180) as resp:
        return resp.read()


def extract_lines(pdf_bytes):
    """Return (text, is_bold, size) per line, plus the modal body font size.

    Font metadata is the reliable heading signal. Section names in real papers
    are same-size bold text, not larger text, and plain-text extraction throws
    that away — which makes regex-on-text detection miss every heading.
    """
    import pymupdf

    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    lines, sizes = [], {}
    try:
        repeated = find_running_text(doc)
        for page in doc:
            top = page.rect.height * MARGIN_FRACTION
            bottom = page.rect.height * (1 - MARGIN_FRACTION)
            for block in order_blocks(page):
                for line in block.get("lines", []):
                    spans = line["spans"]
                    text = "".join(s["text"] for s in spans).strip()
                    if not text:
                        continue
                    y = line["bbox"][1]
                    if (y < top or y > bottom) and is_running_text(text, repeated):
                        continue
                    first = spans[0]
                    size = round(first["size"], 1)
                    bold = bool(first["flags"] & 16) or "bold" in first["font"].lower()
                    sizes[size] = sizes.get(size, 0) + 1
                    lines.append((text, bold, size))
    finally:
        doc.close()
    body_size = max(sizes, key=sizes.get) if sizes else 10.0
    return lines, body_size


def find_running_text(doc):
    """Text appearing in the margins of many pages: headers and footers.

    These repeat on every page and, once columns are reflowed, land in the
    middle of a sentence — "the required time for PRs to be <Paper Title>".
    Frequency across pages identifies them without hardcoding any template.
    """
    counts = {}
    pages = len(doc)
    for page in doc:
        top = page.rect.height * MARGIN_FRACTION
        bottom = page.rect.height * (1 - MARGIN_FRACTION)
        seen = set()
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                y = line["bbox"][1]
                if top <= y <= bottom:
                    continue
                key = normalize_running(
                    "".join(s["text"] for s in line["spans"])
                )
                if key and key not in seen:
                    seen.add(key)
                    counts[key] = counts.get(key, 0) + 1
    threshold = max(3, pages * 0.25)
    return {k for k, n in counts.items() if n >= threshold}


def normalize_running(text):
    """Strip digits so 'Page 4 of 30' and 'Page 5 of 30' collapse together."""
    return re.sub(r"\s+", " ", re.sub(r"\d+", "#", text)).strip().lower()


def is_running_text(text, repeated):
    stripped = text.strip()
    # Bare page numbers vary per page, so frequency never catches them.
    if re.fullmatch(r"[\divxlcIVXLC\-–—.\s]+", stripped):
        return True
    return normalize_running(stripped) in repeated


def is_caption_block(block):
    """True for a table or figure block sitting inside a column of prose.

    These float between paragraphs, so column ordering drops them mid-sentence
    ("the required time for PRs to be Table 3: Metrics used in..."). Their
    extracted contents are unstructured numbers that embed poorly anyway, so
    the whole block goes rather than just its caption line.
    """
    for line in block.get("lines", []):
        text = "".join(s["text"] for s in line["spans"]).strip().lower()
        if not text:
            continue
        return text.startswith(CAPTION_PREFIXES)
    return False


def order_blocks(page):
    """Yield a page's text blocks in true reading order.

    PyMuPDF's own `sort=True` orders by vertical position across the whole
    page, which on a two-column paper interleaves the columns line by line and
    splices unrelated sentences together — poisoning every embedding built from
    them. Detect the column split and read each column top-to-bottom instead.
    """
    blocks = [
        b for b in page.get_text("dict")["blocks"]
        if b.get("lines") and not is_caption_block(b)
    ]
    if not blocks:
        return []

    mid = page.rect.width / 2
    margin = page.rect.width * 0.05
    full, left, right = [], [], []
    for block in blocks:
        x0, _, x1, _ = block["bbox"]
        if x0 < mid - margin and x1 > mid + margin:
            full.append(block)      # spans the gutter: title, wide figure
        elif x0 < mid:
            left.append(block)
        else:
            right.append(block)

    # Too little on the right to be a real second column — treat as one column.
    if len(right) < max(2, 0.15 * len(blocks)):
        return sorted(blocks, key=lambda b: (b["bbox"][1], b["bbox"][0]))

    by_y = lambda bs: sorted(bs, key=lambda b: b["bbox"][1])
    return by_y(full) + by_y(left) + by_y(right)


def looks_like_heading(text, bold, size, body_size):
    if not (bold or size > body_size):
        return False
    if not (2 < len(text) < 70) or len(text.split()) > 9:
        return False
    lowered = text.lower()
    if lowered.startswith(CAPTION_PREFIXES):
        return False
    # Keyword-list fragments and mid-sentence bold runs.
    if text.endswith((",", ";")) or not re.search(r"[A-Za-z]", text):
        return False
    # Headings are title-cased; a bolded sentence opener ("Introduction provides
    # an overview of...") is not. Ignore short words, which are articles and
    # prepositions that stay lowercase in title case anyway.
    significant = [w for w in re.findall(r"[A-Za-z']+", text) if len(w) > 3]
    if significant:
        titled = sum(1 for w in significant if w[0].isupper())
        if titled / len(significant) < 0.6:
            return False
    return True


def classify_heading(text):
    """Map a heading to a canonical bucket, or None if it maps to nothing."""
    lowered = re.sub(r"\s+", " ", text.lower()).strip()
    if any(k in lowered for k in STOP_KEYWORDS):
        return "STOP"
    for name, keywords in SECTION_KEYWORDS:
        if any(k in lowered for k in keywords):
            return name
    return None


def split_sections(lines, body_size):
    """Walk the lines, assigning each to a canonical section bucket."""
    sections = []
    current = DEFAULT_SECTION
    buffer = []
    headings = []
    # References, bibliographies and appendices live in the back of a document,
    # so only honor a stop heading once we are past the midpoint. Without this,
    # a book or dissertation whose ACKNOWLEDGMENTS sit in the front matter — or
    # whose table of contents lists "References" on page ii — truncates the
    # whole document at its second page.
    stop_allowed_from = len(lines) * 0.5

    for index, (text, bold, size) in enumerate(lines):
        if not looks_like_heading(text, bold, size, body_size):
            buffer.append(text)
            continue
        found = classify_heading(text)
        if found == "STOP" and index < stop_allowed_from:
            # Front-matter acknowledgments, or a contents-page entry. Not the
            # real end of the document — keep reading.
            buffer.append(text)
            continue
        headings.append((text, found))
        if buffer:
            sections.append((current, "\n".join(buffer)))
            buffer = []
        if found == "STOP":
            return sections, headings
        # A heading we can't classify still starts a new block; it just keeps
        # the generic bucket rather than being forced into a wrong one.
        current = found or DEFAULT_SECTION
    if buffer:
        sections.append((current, "\n".join(buffer)))
    return sections, headings


# PDF text carries typographic ligatures as single codepoints. Left in place
# they break exact matching ("identiﬁed" != "identified") and add noise to the
# embedding, so normalize them into their component letters.
LIGATURES = {
    "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi",
    "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st",
    "‘": "'", "’": "'", "“": '"', "”": '"',
    "–": "-", "—": "-", "−": "-", " ": " ",
}


def clean(text):
    for bad, good in LIGATURES.items():
        text = text.replace(bad, good)
    # Table-of-contents dot leaders ("Introduction .......... 12"). Only a few
    # words, but thousands of characters that tokenize into far more tokens
    # than the embedding model's context window — the whole run is noise.
    text = re.sub(r"[.·․]{3,}", " ", text)
    text = re.sub(r"[_\-—–]{4,}", " ", text)
    text = text.replace("­", "")           # soft hyphen
    text = re.sub(r"-\n(\w)", r"\1", text)      # de-hyphenate across line breaks
    text = re.sub(r"\s*\n\s*", " ", text)       # unwrap lines
    text = re.sub(r"\[\d+(,\s*\d+)*\]", "", text)  # inline citation markers
    return re.sub(r"\s{2,}", " ", text).strip()


def chunk_section(text):
    """Fixed-size windows within a section, so no chunk straddles a boundary."""
    words = text.split()
    if len(words) < MIN_WORDS:
        return []
    step = TARGET_WORDS - OVERLAP_WORDS
    out = []
    for start in range(0, len(words), step):
        window = words[start : start + TARGET_WORDS]
        if len(window) < MIN_WORDS and out:
            # Fold a short tail into the previous chunk rather than emitting it.
            out[-1] = f"{out[-1]} {' '.join(window)}"
            break
        out.append(" ".join(window))
        if start + TARGET_WORDS >= len(words):
            break
    # Word count is a poor proxy for token count on degenerate text (tables,
    # ASCII art, long identifiers), and overrunning the embedding model's
    # context is a hard failure rather than a truncation. Cap on characters too.
    return [piece for chunk in out for piece in split_on_length(chunk)]


def split_on_length(chunk):
    if len(chunk) <= MAX_CHARS:
        return [chunk]
    return [chunk[i : i + MAX_CHARS] for i in range(0, len(chunk), MAX_CHARS)]


def main():
    # PDFs carry characters the Windows console encoding cannot represent.
    # Without this the dry-run preview dies on a ligature — losing the quality
    # gate over a printing detail.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass

    p = argparse.ArgumentParser()
    p.add_argument("--doi", required=True, help="Stored paper id, e.g. consensus:<hash>")
    p.add_argument("--pdf", help="Use a local PDF instead of resolving one")
    p.add_argument("--dry-run", action="store_true", help="Extract and report only")
    args = p.parse_args()

    r = redis_client()
    key = f"{KEY_PREFIX}{re.sub(r'[^a-zA-Z0-9._-]', '_', args.doi)}"
    paper = r.json().get(key)
    if not paper:
        raise SystemExit(f"No stored paper at {key}. Ingest it first.")

    title = paper.get("title", "")
    print(f"Paper: {title[:70]}")

    if args.pdf:
        pdf_bytes = open(args.pdf, "rb").read()
        source = args.pdf
    else:
        try:
            url = resolve_arxiv_pdf(title)
        except LookupFailed as e:
            raise SystemExit(f"  arXiv lookup failed ({e}) — unknown, not absent. Retry later.")
        if not url:
            print("  Not on arXiv. Paper stays abstract-only.")
            return
        print(f"  Source: {url}")
        pdf_bytes = download(url)
        source = url

    lines, body_size = extract_lines(pdf_bytes)
    print(f"  Extracted {len(lines)} lines (body font {body_size})")

    sections, headings = split_sections(lines, body_size)
    found = sorted({name for name, _ in sections})
    print(f"  Sections: {', '.join(found)}")
    if args.dry_run and headings:
        print("  Headings detected:")
        for text, bucket in headings:
            print(f"    {bucket or DEFAULT_SECTION:13} <- {text[:52]}")

    chunks = []
    for name, raw in sections:
        for body in chunk_section(clean(raw)):
            chunks.append((name, body))

    if not chunks:
        print("  No usable chunks after cleaning — check extraction quality.")
        return

    by_section = {}
    for name, _ in chunks:
        by_section[name] = by_section.get(name, 0) + 1
    print(f"  {len(chunks)} chunks: " + ", ".join(f"{k}={v}" for k, v in by_section.items()))

    if args.dry_run:
        print("\n--- first chunk of each section ---")
        seen = set()
        for name, body in chunks:
            if name in seen:
                continue
            seen.add(name)
            print(f"\n[{name}] {body[:300]}...")
        return

    # Replace any previous chunks for this paper so re-running is idempotent.
    existing = list(r.scan_iter(match=f"{CHUNK_PREFIX}{args.doi}:*", count=1000))
    if existing:
        r.delete(*existing)
        print(f"  Replaced {len(existing)} existing chunks")

    pipe = r.pipeline()
    for ordinal, (name, body) in enumerate(chunks):
        doc = {
            "doi": args.doi,
            "title": title,
            "year": paper.get("year", 0),
            "section": name,
            "ordinal": ordinal,
            "text": body,
            "source": source,
            "embedding": embed(body),
        }
        pipe.json().set(f"{CHUNK_PREFIX}{args.doi}:{ordinal:04d}", "$", doc)
        if ordinal % 25 == 24:
            pipe.execute()
            pipe = r.pipeline()
    pipe.execute()
    print(f"  Indexed {len(chunks)} chunks.")


if __name__ == "__main__":
    main()