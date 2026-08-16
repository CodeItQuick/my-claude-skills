---
name: paper-recommender
description: Searches and recommends scholarly articles from a local Redis vector store built from Consensus searches. Use when the user asks to "find papers on X", "what should I read about X", "add these papers to my library", "what does my corpus say about X", or asks for reading recommendations from their saved research.
---

# Paper Recommender

A personal library of scholarly papers in Redis, searched by meaning rather than
keyword. You do the thinking; the scripts only fetch.

Run scripts from `scripts/`. They read `REDIS_URL` (default
`redis://localhost:6379`) and `OLLAMA_URL` (default `http://localhost:11434`).

## Adding papers

**The Consensus connector returns rendered prose, not JSON.** You transcribe its
results into the shape below and write that to a file; `ingest.py` reads the
file. There is no pipe-the-connector-output shortcut.

1. Search Consensus for the topic the user named. Run **two or three differently
   phrased searches**, not one — the connector's own ranking is lexical enough
   that a single phrasing misses whole clusters of relevant work. Vary the
   vocabulary (the field's term, the outcome measured, the mechanism). Batch at
   most 3 calls at a time; on a rate-limit error, wait ~30s and retry the ones
   that failed rather than abandoning them.

2. Transcribe the results to a JSON list. Only `title` is required — a paper
   without one is skipped:

   ```json
   [{
     "title": "...",
     "abstract": "...",
     "doi": "consensus:<hash from the paper URL>",
     "url": "https://consensus.app/papers/details/<hash>/",
     "year": 2021,
     "journal": "...",
     "citations": 47,
     "study_type": "systematic review",
     "sample_size": 162653,
     "authors": ["Surname A", "Surname B"]
   }]
   ```

   Two fields need care:

   - **`doi` — Consensus does not return DOIs.** Use `consensus:<hash>` taken
     from the paper's URL. It is the dedup key, and it is stable across
     searches, so overlapping results update in place instead of duplicating.
     Getting this wrong silently fills top-k with copies of the same paper.
   - **`study_type` — Consensus does not return it either.** Infer it only when
     the abstract states the design outright ("systematic literature review",
     "multiple-case study", "we surveyed"). Leave it `""` when unclear. It is a
     filter field, so a guess here quietly misleads later searches. Prefer an
     empty value over a plausible one.

   `sample_size` is participants, projects, or studies depending on the design —
   record what the abstract actually counted, and use 0 when it counts nothing.

3. Run it:

   ```
   python ingest.py < papers.json
   ```

   It embeds title + abstract and upserts by `doi`. It never calls Consensus
   itself — you fetch, it stores — so the connector's output format can change
   without touching storage.

4. Report what landed: added versus updated, anything skipped, and say plainly
   that `study_type` values are your inference rather than source data.

## Recommending

1. Run `search.py` with the user's actual question, not a keyword reduction of it
   — the embedding is of their phrasing, so "does sleep help memory" retrieves
   better than "sleep memory":

   ```
   python search.py --query "<the user's question>" --k 30
   ```

   Add filters only when the user constrained things: `--min-year`,
   `--max-year`, `--min-citations`, `--min-sample-size`, `--study-type`,
   `--journal` (the last two repeatable and OR-ed). Filters run inside Redis
   before the vector search.

2. **Look at the shape of the top-k before reading it closely.** If the results
   are monotone — nearly every title circling one term, one sub-topic, one
   vocabulary — the query word anchored retrieval instead of the meaning, and
   whole clusters of relevant work are missing rather than ranked low. Re-query
   from a different angle and merge the results: name the outcome measured
   ("effect on delivery time") or the mechanism rather than the umbrella term.

   This is not a rare edge case. A query phrased around "DevOps" returned twelve
   DevOps-titled papers and none of the largest studies in the corpus, because
   those are titled around continuous integration and pull requests. A second
   query on "delivery time, lead time, cycle time" surfaced them at rank 1 and 2.
   The corpus was fine; one phrasing simply could not see it.

   Until Redis is upgraded and `FT.HYBRID` adds a lexical leg, querying more
   than once *is* the compensation for having no BM25 scoring. Two or three
   angles on any question worth answering carefully.

3. Read the returned abstracts and decide. `similarity` orders candidates; it
   does not establish relevance. A 0.7 match on the wrong question is still the
   wrong paper, and the right paper sometimes sits sixth. Over-fetching is
   deliberate — the script hands you more than the user needs so that you, not
   the cosine distance, make the final cut.

4. Recommend with reasoning: why this paper, what it actually found, how it
   relates to the others, and where they disagree. Cite title and year inline.
   Never describe a finding that isn't in the retrieved abstract — if the
   abstract doesn't say it, say that the abstract doesn't say it.

   Where the evidence splits, say so and weigh it: sample size, study design,
   and venue are in the returned fields precisely so you can. A 162,000-PR
   mining study and a four-company case study are not two equal votes.

5. If nothing retrieved is a good answer, say so and offer to search Consensus
   for new papers. A thin library is a fixable problem; a confident answer built
   from three loosely-related abstracts is not.

## Setup and maintenance

`python setup_index.py` creates the index and is a no-op if it exists.
`--force` rebuilds the schema over existing documents; `--purge` also deletes
every paper. Current schema: FLAT vector index, 768 dims (`nomic-embed-text`),
COSINE distance, over `paper:*` JSON documents.

**Load the `redis-search` skill before changing the schema, altering the query
syntax, or debugging empty results.** This skill owns the corpus and what
counts as a good recommendation; `redis-search` owns Redis. Two decisions in
here came from it and should be revisited there, not re-derived:

- **FLAT, not HNSW.** Exact recall and lower memory, correct below ~10k
  vectors. Past that, build an HNSW index under a new name and move an alias —
  don't drop this one.
- **Filter-prefixed KNN, not `FT.HYBRID`.** `FT.HYBRID` fuses BM25 with vector
  scoring and needs Redis >= 8.4; this instance is 7.4. If Redis is upgraded,
  hybrid retrieval is worth revisiting — exact technical terms matter in
  scholarly search, and lexical scoring is what the current setup gives up.

Changing the embedding model means re-embedding everything and rebuilding the
index with the new `DIM`. Set `PAPER_EMBED_MODEL` and `PAPER_EMBED_DIM`;
`ingest.py` fails loudly on a dimension mismatch rather than writing silent
garbage.

`fixtures/sample_papers.json` holds six papers (three on sleep and memory, one
on exercise, two unrelated) for verifying that retrieval still discriminates
after a change.