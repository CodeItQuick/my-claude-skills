# Example — Transformation Task

**Input prompt:**
> Summarize this article.

**Phase 1:**
- Task type: Transformation (summarisation)
- Techniques present: none
- Output requirements: unspecified
- Complexity: low
- Context constraints: none

**Phase 2 — files loaded:** `techniques-examples.md`, `techniques-structure.md`

**Gaps identified:**
- Constraint specification (High) — no length, format, or audience specified
- Few-shot (Medium) — no example of what "a good summary" looks like
- Role prompting (Low) — marginal; task is clear without a persona

---

**Current state:** The prompt is syntactically correct but leaves every output decision — length, format, reading level, focus — to the model. The biggest gap is the absence of any constraints, which will produce inconsistent output across runs.

| Priority | Technique | Gap it fixes | How to apply |
|---|---|---|---|
| High | Constraint specification | Length, audience, and focus are all implicit | Specify word count, target audience, and whether to preserve or discard technical detail |
| Medium | Few-shot | The model's definition of "a good summary" may not match yours | Add one example of an article excerpt and the summary you consider ideal |

**Rewritten prompt:**
> Summarize the following article in 3–5 sentences for a general audience with no technical background. Focus on the main conclusion and its practical implications. Omit methodology details.
>
> {article}