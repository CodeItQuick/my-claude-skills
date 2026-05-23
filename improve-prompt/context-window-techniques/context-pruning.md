# Context pruning

Strip irrelevant content from the injected context before submitting — only include the document sections, history turns, or code that bear on the current task.

**Use when:** the prompt injects full documents, full conversation history, or large code files when only a portion is relevant.

**Gap it fixes:** the model's attention diluted across irrelevant material, reducing answer quality and wasting context budget.

**Example:** Instead of injecting the full codebase, inject only the file and function the question is about.