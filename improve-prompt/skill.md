---
name: improve-prompt
description: Analyzes a prompt and suggests specific prompting techniques to improve it. Triggers on "improve this prompt", "make this prompt better", "what prompting techniques should I use", "how can I improve my prompt", or "critique this prompt".
---

# Improve Prompt

Analyze a prompt and suggest concrete prompting techniques that would make it more effective.

## Input

The prompt to improve is provided as the argument to this skill. If no prompt is provided, ask for one before proceeding.

## Flags

`--goal=<description>` — describe what the prompt is trying to achieve if it isn't clear from the prompt itself. Helps Phase 1 classification when the prompt is ambiguous.

`--model=<name>` — the model the prompt will be used with. Default: assume a capable frontier model.

`--expand` — include Medium-priority suggestions in the rewritten prompt in addition to High-priority ones.

---

## Workflow

### Phase 0 — Confirm input

If no prompt was provided as an argument, ask for one before proceeding. Do not begin Phase 1 until the prompt to improve is in hand.

---

### Phase 1 — Classify the prompt

Identify:
1. **Task type** — what is the prompt asking the model to do?
   - Reasoning / analysis (logic, math, debugging, decisions)
   - Generation (writing, code, ideas, summaries)
   - Extraction (pulling structured data from unstructured text)
   - Classification (categorising, labelling, scoring)
   - Transformation (translate, reformat, rewrite)
   - Conversational (open-ended, multi-turn)

2. **Current techniques present** — note which techniques are already in use so they are not re-suggested.

3. **Output requirements** — what does the prompt expect back? Is it structured or freeform? Long or short? For a human or a machine?

4. **Complexity level** — is this a single-step task or does it require multi-step reasoning?

5. **Context constraints** — does the prompt inject or depend on large inputs (documents, codebases, conversation history, full API responses)? Flag as **context-constrained** if the input could realistically exceed the model's context window or dilute attention across irrelevant material.

---

### Phase 2 — Load technique files and identify gaps

Load only the files relevant to this prompt — do not read files that don't apply.

**If context-constrained:** read `context-window-techniques/index.md` first, then load the task-type files below.
**If not context-constrained:** skip `context-window-techniques/index.md` entirely.

| Task type | Files to load |
|---|---|
| Reasoning / analysis | `reasoning-techniques/index.md` + `structure-techniques/index.md` |
| Generation | `example-techniques/index.md` + `structure-techniques/index.md` |
| Extraction | `structure-techniques/index.md` + `example-techniques/index.md` |
| Classification | `reasoning-techniques/index.md` + `structure-techniques/index.md` |
| Transformation | `example-techniques/index.md` + `structure-techniques/index.md` |
| Conversational | `structure-techniques/index.md` |

For each loaded technique, assign a priority:
- **High** — the prompt has a clear weakness this technique directly addresses
- **Medium** — would improve consistency or quality but the prompt works without it
- **Low** — applicable but marginal gain

Suppress a technique if:
- It is already present in the prompt
- The task type makes it inapplicable (e.g., structured output for a conversational prompt)
- Adding it would make the prompt significantly longer without proportionate gain

---

### Phase 3 — Output

#### Section 1 — Current state (2–3 sentences)
What the prompt is doing well and what the most significant gap is.

#### Section 2 — Suggestions table
One row per suggestion, High priority first. Include only High or Medium — suppress Low. If there are no findings, omit this table.

| Priority | Technique | Gap it fixes | How to apply |
|---|---|---|---|
| High | Few-shot | No examples given; output format is ambiguous | Add 2–3 input→output pairs before the main instruction |
| Medium | Constraint specification | Length and audience are implicit | Add explicit word count and audience statement |

#### Section 3 — Rewritten prompt
Incorporate all High-priority suggestions. If `--expand` was passed, also incorporate Medium. If there are no High or Medium suggestions, emit: *No suggestions — the prompt is already well-formed for its task type.* Do not produce a rewrite.

---

## Examples

For worked examples by task type, see `examples/`:
- Transformation task → `examples/example-transformation.md`
- Reasoning task → `examples/example-reasoning.md`
- Context-constrained prompt → `examples/example-context-constrained.md`