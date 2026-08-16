#!/usr/bin/env python
"""Embed papers and upsert them into Redis. Reads JSON on stdin.

    <consensus results> | python ingest.py
    python ingest.py < fixtures/sample_papers.json

Accepts either a bare JSON list of papers or an object with the list under
"papers", "results", or "data". This script never calls Consensus itself —
Claude fetches the papers and pipes them here, so the connector's schema can
change without touching storage.

Upserts are keyed on DOI, so re-ingesting overlapping searches updates papers
in place instead of accumulating duplicates that crowd out top-k.
"""

import hashlib
import json
import re
import sys

from common import KEY_PREFIX, embed, embed_text_for, redis_client

# Field name variants seen across Consensus payloads and hand-made fixtures.
ALIASES = {
    "title": ("title", "paper_title", "name"),
    "abstract": ("abstract", "summary", "text", "tldr"),
    "doi": ("doi", "DOI", "paper_doi"),
    "year": ("year", "publication_year", "published_year", "date"),
    "journal": ("journal", "venue", "publication", "journal_name"),
    "citations": ("citations", "citation_count", "cited_by_count", "num_citations"),
    "study_type": ("study_type", "study_types", "publication_type", "design"),
    "sample_size": ("sample_size", "n", "participants"),
    "url": ("url", "link", "paper_url"),
    "authors": ("authors", "author_names", "author"),
}


def pick(paper, field):
    for key in ALIASES[field]:
        if key in paper and paper[key] not in (None, "", [], {}):
            return paper[key]
    return None


def as_int(value):
    """Coerce to int, tolerating '2019', '2019-04-01', 1200.0, and junk."""
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(value)
    match = re.search(r"\d+", str(value))
    return int(match.group()) if match else 0


def as_tag(value):
    """Collapse a scalar or list into a comma-separated TAG string."""
    if value is None:
        return ""
    if isinstance(value, (list, tuple)):
        parts = [str(v).strip() for v in value if str(v).strip()]
    else:
        parts = [str(value).strip()]
    # Commas are the TAG separator, so they cannot survive inside a value.
    return ",".join(p.replace(",", " ") for p in parts)


def doc_key(doi, title):
    if doi:
        slug = re.sub(r"[^a-zA-Z0-9._-]", "_", str(doi))
        return f"{KEY_PREFIX}{slug}"
    # No DOI: hash the title so re-ingesting the same paper still overwrites.
    digest = hashlib.sha1((title or "").encode()).hexdigest()[:16]
    return f"{KEY_PREFIX}notitle_{digest}" if not title else f"{KEY_PREFIX}t_{digest}"


def normalize(paper):
    title = pick(paper, "title")
    if not title:
        return None
    doi = pick(paper, "doi")
    return {
        "doi": str(doi) if doi else "",
        "title": str(title).strip(),
        "abstract": str(pick(paper, "abstract") or "").strip(),
        "journal": as_tag(pick(paper, "journal")),
        "study_type": as_tag(pick(paper, "study_type")),
        "year": as_int(pick(paper, "year")),
        "citations": as_int(pick(paper, "citations")),
        "sample_size": as_int(pick(paper, "sample_size")),
        "url": str(pick(paper, "url") or ""),
        "authors": as_tag(pick(paper, "authors")),
    }


def main():
    raw = json.load(sys.stdin)
    if isinstance(raw, dict):
        for key in ("papers", "results", "data"):
            if isinstance(raw.get(key), list):
                raw = raw[key]
                break
        else:
            raw = [raw]
    if not isinstance(raw, list):
        raise SystemExit("Expected a JSON list of papers, or an object containing one.")

    r = redis_client()
    written = skipped = 0

    for paper in raw:
        if not isinstance(paper, dict):
            skipped += 1
            continue
        doc = normalize(paper)
        if doc is None:
            skipped += 1
            print("  skipped: no title", file=sys.stderr)
            continue

        text = embed_text_for(doc)
        if not text:
            skipped += 1
            continue
        doc["embedding"] = embed(text)

        key = doc_key(doc["doi"], doc["title"])
        existed = r.exists(key)
        r.json().set(key, "$", doc)
        written += 1
        verb = "updated" if existed else "added"
        print(f"  {verb}: {doc['title'][:70]}", file=sys.stderr)

    print(f"\n{written} written, {skipped} skipped.", file=sys.stderr)


if __name__ == "__main__":
    main()