# Retrieval-augmented context (RAG)

Instead of injecting full documents, retrieve only the snippets most relevant to the current query at runtime.

**Use when:** the prompt depends on a large knowledge base, documentation set, or codebase that cannot fit in context.

**Gap it fixes:** the choice between injecting too much (wasted tokens, diluted attention) or too little (missing relevant facts).

**Note:** requires a retrieval system (embedding search, keyword search, etc.) upstream of the prompt — this is an architecture-level technique, not a text-level one.