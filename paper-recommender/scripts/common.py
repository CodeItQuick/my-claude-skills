"""Shared config and helpers for the paper-recommender scripts."""

import os
import struct
import time
import urllib.error
import urllib.request
import json

INDEX_NAME = "papers_idx"
KEY_PREFIX = "paper:"

# Full-text passages live in a second index. Separate because a KNN over mixed
# granularity is dominated by whichever granularity is more numerous — with
# ~100 chunks per paper, chunks would swamp every paper-level search.
CHUNK_INDEX_NAME = "chunks_idx"
CHUNK_PREFIX = "chunk:"

EMBED_MODEL = os.environ.get("PAPER_EMBED_MODEL", "nomic-embed-text")
EMBED_DIM = int(os.environ.get("PAPER_EMBED_DIM", "768"))
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")


def redis_client():
    import redis

    return redis.from_url(REDIS_URL, decode_responses=True)


def embed(text, attempts=4):
    """Embed one string via Ollama. Returns a list of floats of length EMBED_DIM.

    Retries transient failures. Ollama returns a 500 now and then under a long
    burst (model reload, GPU contention); without a retry a single blip aborts
    a multi-hundred-chunk indexing run and discards everything done so far.
    """
    payload = json.dumps({"model": EMBED_MODEL, "prompt": text}).encode()
    vec = None
    for attempt in range(attempts):
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/embeddings",
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                vec = json.load(resp)["embedding"]
            break
        except urllib.error.HTTPError as e:
            if attempt == attempts - 1:
                raise SystemExit(f"Ollama at {OLLAMA_URL} returned HTTP {e.code} repeatedly.")
            time.sleep(2 ** attempt)
        except urllib.error.URLError as e:
            raise SystemExit(
                f"Could not reach Ollama at {OLLAMA_URL} ({e}). Is `ollama serve` running?"
            )

    # A dimension mismatch produces silent garbage in Redis rather than an error,
    # so fail loudly here instead.
    if len(vec) != EMBED_DIM:
        raise SystemExit(
            f"{EMBED_MODEL} returned {len(vec)} dims, index expects {EMBED_DIM}. "
            f"Set PAPER_EMBED_DIM and rebuild the index."
        )
    return vec


def to_bytes(vec):
    """Pack a float list into the FLOAT32 blob Redis expects as a query param."""
    return struct.pack(f"{len(vec)}f", *vec)


def embed_text_for(paper):
    """The text that gets embedded. Title alone loses most of the signal."""
    title = (paper.get("title") or "").strip()
    abstract = (paper.get("abstract") or "").strip()
    return f"{title}\n\n{abstract}".strip()