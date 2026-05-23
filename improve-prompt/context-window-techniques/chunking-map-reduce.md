# Chunking + map-reduce

Split an input too large to fit in one context into chunks, process each independently, then combine or summarize the results in a second pass.

**Use when:** the document or dataset to be processed exceeds the context window.

**Gap it fixes:** hard failure when input exceeds the limit, or degraded quality when the model is forced to compress a huge input on its own.

**Example:**
```
Pass 1 (per chunk): Summarize the key points of this section: {chunk}
Pass 2 (combining): Given these section summaries, answer: {question}
```