#!/usr/bin/env python
"""Retrieve candidate papers. Prints JSON to stdout.

    python search.py --query "sleep and memory consolidation" --k 30
    python search.py --query "..." --min-year 2020 --study-type "meta-analysis"

Metadata filters are applied inside Redis *before* the vector comparison, so
the KNN search runs over the narrowed set rather than the whole corpus.

This script deliberately does no ranking beyond vector distance and no
summarizing. It over-fetches candidates and hands them back; deciding which
papers actually answer the question is Claude's job, not this script's.
"""

import argparse
import json
import re
import sys

from redis.commands.search.query import Query

from common import INDEX_NAME, embed, redis_client, to_bytes

RETURN_FIELDS = (
    "title",
    "abstract",
    "doi",
    "journal",
    "study_type",
    "year",
    "citations",
    "sample_size",
    "url",
    "authors",
)


def escape_tag(value):
    """Escape a TAG value for the query DSL.

    Spaces and hyphens are stored intact at ingest, so they must be escaped
    here rather than stripped — otherwise multi-word values like "meta
    analysis" and hyphenated ones never match.
    """
    cleaned = re.sub(r"[^a-zA-Z0-9 \-_.]", "", str(value)).strip()
    return re.sub(r"([ \-.])", r"\\\1", cleaned)


def build_filter(args):
    parts = []
    if args.min_year is not None:
        parts.append(f"@year:[{args.min_year} +inf]")
    if args.max_year is not None:
        parts.append(f"@year:[-inf {args.max_year}]")
    if args.min_citations is not None:
        parts.append(f"@citations:[{args.min_citations} +inf]")
    if args.min_sample_size is not None:
        parts.append(f"@sample_size:[{args.min_sample_size} +inf]")
    for name, values in (("study_type", args.study_type), ("journal", args.journal)):
        tags = [escape_tag(v) for v in (values or [])]
        tags = [t for t in tags if t]
        if tags:
            parts.append(f"@{name}:{{{'|'.join(tags)}}}")
    # "*" is the match-everything prefix when nothing is filtered.
    return " ".join(parts) if parts else "*"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--query", required=True, help="The user's actual question, verbatim")
    p.add_argument("--k", type=int, default=30, help="Candidates to return (default 30)")
    p.add_argument("--min-year", type=int)
    p.add_argument("--max-year", type=int)
    p.add_argument("--min-citations", type=int)
    p.add_argument("--min-sample-size", type=int)
    p.add_argument("--study-type", action="append", help="Repeatable; OR-ed together")
    p.add_argument("--journal", action="append", help="Repeatable; OR-ed together")
    args = p.parse_args()

    r = redis_client()
    filter_expr = build_filter(args)
    vec = embed(args.query)

    # Filter-then-vector. FT.HYBRID (BM25 + vector fusion) would additionally
    # score the title/abstract text, but it needs Redis >= 8.4 — this instance
    # is 7.4, where the filter-prefixed KNN form below is the correct approach.
    query = (
        Query(f"({filter_expr})=>[KNN {args.k} @embedding $vec AS distance]")
        .sort_by("distance", asc=True)  # COSINE distance: lower is more similar
        .return_fields(*RETURN_FIELDS, "distance")
        .paging(0, args.k)
        .dialect(2)
    )

    try:
        res = r.ft(INDEX_NAME).search(query, query_params={"vec": to_bytes(vec)})
    except Exception as e:
        raise SystemExit(
            f"Search failed: {e}\n"
            f"If the index is missing, run setup_index.py. "
            f"To inspect the parsed query, use FT.EXPLAIN on:\n"
            f"  ({filter_expr})=>[KNN {args.k} @embedding $vec AS distance]"
        )

    papers = []
    for doc in res.docs:
        item = {f: getattr(doc, f, "") for f in RETURN_FIELDS}
        for numeric in ("year", "citations", "sample_size"):
            item[numeric] = int(item[numeric] or 0)
        distance = float(getattr(doc, "distance", 1.0))
        item["similarity"] = round(1.0 - distance, 4)
        papers.append(item)

    json.dump(
        {"query": args.query, "filter": filter_expr, "count": len(papers), "papers": papers},
        sys.stdout,
        indent=2,
    )
    print()


if __name__ == "__main__":
    main()