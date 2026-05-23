# Context Window Techniques — Index

Load these when the prompt is flagged as **context-constrained** in Phase 1. Evaluate before prompt-engineering techniques when context is the bottleneck.

Load the individual files from this folder based on what applies:

| Technique | When to reach for it | File |
|---|---|---|
| Context pruning | Full documents or large files injected when only a portion is relevant | `context-pruning.md` |
| Chunking + map-reduce | Input exceeds the context window; must be processed in passes | `chunking-map-reduce.md` |
| Conversation compression | Multi-turn history is consuming the context budget | `conversation-compression.md` |
| Retrieval-augmented context (RAG) | Prompt depends on a knowledge base too large to inject | `retrieval-augmented-context.md` |