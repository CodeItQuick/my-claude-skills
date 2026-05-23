# Context Window Techniques — Index

Load these when the prompt is flagged as **context-constrained** in Phase 1. Evaluate before prompt-engineering techniques when context is the bottleneck.

| Technique | When to reach for it | File |
|---|---|---|
| Context pruning | Full documents or large files injected when only a portion is relevant | `../context-window-techniques/context-pruning.md` |
| Chunking + map-reduce | Input exceeds the context window; must be processed in passes | `../context-window-techniques/chunking-map-reduce.md` |
| Conversation compression | Multi-turn history is consuming the context budget | `../context-window-techniques/conversation-compression.md` |
| Retrieval-augmented context (RAG) | Prompt depends on a knowledge base too large to inject | `../context-window-techniques/retrieval-augmented-context.md` |