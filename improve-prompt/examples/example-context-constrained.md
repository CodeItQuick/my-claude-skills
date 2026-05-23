# Example — Context-Constrained Prompt

**Input prompt:**
> Read through the attached codebase and tell me if there are any bugs.

**Phase 1:**
- Task type: Reasoning / analysis
- Techniques present: none
- Output requirements: a list of bugs — freeform
- Complexity: high
- **Context constraints: high** — "the attached codebase" implies injecting potentially thousands of lines; attention will be diluted and the window may be exceeded entirely

**Phase 2 — files loaded:** `context-window-techniques.md` first, then `techniques-reasoning.md`, `techniques-structure.md`

**Gaps identified:**
- Context pruning (High) — the prompt injects the full codebase when only a specific file or function needs to be reviewed
- Chunking + map-reduce (High) — if the full codebase must be covered, it must be processed in chunks with results combined in a second pass
- Constraint specification (Medium) — "bugs" is undefined; no severity threshold, file scope, or output format specified

---

**Current state:** The prompt correctly names the task but will fail or produce shallow results on any real codebase — it injects the entire codebase into a single context window, which either exceeds the limit or dilutes the model's attention across irrelevant files. The context constraints must be resolved before prompt-engineering improvements will matter.

| Priority | Technique | Gap it fixes | How to apply |
|---|---|---|---|
| High | Context pruning | The full codebase is injected; only the relevant file or function should be passed | Replace "the attached codebase" with a `{file}` placeholder and instruct the caller to scope the input |
| High | Chunking + map-reduce | If full-codebase coverage is required, one pass cannot fit in context | Add a two-pass instruction: summarise findings per file in Pass 1, then consolidate in Pass 2 |
| Medium | Constraint specification | "Bugs" is undefined — severity, category, and output format are all implicit | Specify severity threshold (e.g. logic errors and unhandled exceptions only), and request line number + description + suggested fix per finding |

**Rewritten prompt:**
> Review the following {language} file for bugs. Focus on logic errors, off-by-one errors, and unhandled exceptions. For each bug found, provide: the line number, a one-sentence description, and a suggested fix. Ignore style issues.
>
> {file_content}