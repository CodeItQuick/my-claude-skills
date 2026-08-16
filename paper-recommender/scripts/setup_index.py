#!/usr/bin/env python
"""Create the papers index. Idempotent: a no-op if the index already exists.

    python setup_index.py           # create if missing
    python setup_index.py --force   # drop (keeping documents) and recreate
    python setup_index.py --purge   # drop index AND delete every paper document
"""

import sys

from redis.commands.search.field import NumericField, TagField, TextField, VectorField
from redis.commands.search.index_definition import IndexDefinition, IndexType

from common import (
    CHUNK_INDEX_NAME,
    CHUNK_PREFIX,
    EMBED_DIM,
    INDEX_NAME,
    KEY_PREFIX,
    redis_client,
)

# FLAT is exact (100% recall) and uses less memory than HNSW. A personal library
# of a few thousand papers is well inside the range where the approximate index
# buys nothing. Past ~10k vectors, switch to HNSW — build the new index under a
# second name and move the alias, rather than dropping this one.
VECTOR_ALGO = "FLAT"

SCHEMA = (
    TagField("$.doi", as_name="doi"),
    TextField("$.title", as_name="title", weight=2.0),
    TextField("$.abstract", as_name="abstract"),
    TagField("$.journal", as_name="journal", sortable=True),
    TagField("$.study_type", as_name="study_type", sortable=True),
    NumericField("$.year", as_name="year", sortable=True),
    NumericField("$.citations", as_name="citations", sortable=True),
    NumericField("$.sample_size", as_name="sample_size", sortable=True),
    VectorField(
        "$.embedding",
        VECTOR_ALGO,
        {
            "TYPE": "FLOAT32",
            "DIM": EMBED_DIM,
            # nomic-embed-text produces normalized vectors — COSINE is the match.
            "DISTANCE_METRIC": "COSINE",
        },
        as_name="embedding",
    ),
)


# One paper yields roughly 100 chunks, so this index crosses the ~10k-vector
# mark where exact search stops being free. HNSW from the start; papers_idx
# stays FLAT because it only ever holds one vector per paper.
CHUNK_SCHEMA = (
    TagField("$.doi", as_name="doi"),
    TagField("$.section", as_name="section", sortable=True),
    TextField("$.text", as_name="text"),
    TextField("$.title", as_name="title"),
    NumericField("$.year", as_name="year", sortable=True),
    NumericField("$.ordinal", as_name="ordinal", sortable=True),
    VectorField(
        "$.embedding",
        "HNSW",
        {
            "TYPE": "FLOAT32",
            "DIM": EMBED_DIM,
            "DISTANCE_METRIC": "COSINE",
            "M": 16,
            "EF_CONSTRUCTION": 200,
        },
        as_name="embedding",
    ),
)


def index_exists(r, name):
    try:
        r.ft(name).info()
        return True
    except Exception:
        return False


def ensure(r, name, schema, prefix, algo, force, purge):
    if index_exists(r, name):
        if not (force or purge):
            print(f"{name} already exists. Nothing to do.")
            return
        # DD deletes the indexed documents too; without it they survive and are
        # re-indexed by the new schema.
        r.ft(name).dropindex(delete_documents=purge)
        print(f"Dropped {name}" + (" and its documents." if purge else "."))

    r.ft(name).create_index(
        schema,
        definition=IndexDefinition(prefix=[prefix], index_type=IndexType.JSON),
    )
    print(f"Created {name} ({algo}, {EMBED_DIM} dims, COSINE) on {prefix}*")


def main():
    force = "--force" in sys.argv
    purge = "--purge" in sys.argv
    r = redis_client()
    ensure(r, INDEX_NAME, SCHEMA, KEY_PREFIX, VECTOR_ALGO, force, purge)
    ensure(r, CHUNK_INDEX_NAME, CHUNK_SCHEMA, CHUNK_PREFIX, "HNSW", force, purge)


if __name__ == "__main__":
    main()