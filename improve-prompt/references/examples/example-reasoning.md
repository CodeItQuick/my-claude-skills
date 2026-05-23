# Example — Reasoning Task

**Input prompt:**
> Is this code thread-safe?

**Phase 1:**
- Task type: Reasoning / analysis
- Techniques present: none
- Output requirements: a verdict — but no code has been provided, and the expected reasoning depth is unspecified
- Complexity: high (requires tracing shared state, locks, and concurrent access paths)
- Context constraints: none

**Phase 2 — files loaded:** `techniques-reasoning.md`, `techniques-structure.md`

**Gaps identified:**
- Constraint specification (High) — no `{code}` placeholder; the prompt cannot be answered as written
- Chain-of-thought (High) — a bare yes/no verdict cannot be verified or trusted without visible reasoning
- Role prompting (Medium) — thread-safety analysis benefits from a concurrency-specialist mental model

---

**Current state:** The prompt names the task correctly but provides nothing for the model to analyse — there is no code placeholder. Even once code is added, a bare verdict is untrustworthy; the model must reason through shared state and access paths before concluding.

| Priority | Technique | Gap it fixes | How to apply |
|---|---|---|---|
| High | Constraint specification | No code or language is supplied — the prompt is unanswerable | Add a `{code}` placeholder and specify the language or runtime |
| High | Chain-of-thought | A yes/no answer with no reasoning cannot be verified | Add: "Reason through the shared state, locks, and concurrent access paths before giving your verdict" |
| Medium | Role prompting | Generic answers may miss concurrency-specific reasoning patterns | Prepend: "You are a senior systems engineer reviewing for concurrency bugs" |

**Rewritten prompt:**
> You are a senior systems engineer reviewing for concurrency bugs. Analyse the following {language} code for thread-safety. Reason through the shared state, any locks or synchronisation primitives, and all concurrent access paths before giving your verdict.
>
> {code}