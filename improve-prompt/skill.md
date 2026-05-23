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

`--model=<name>` — the model the prompt will be used with. Default: assume a capable frontier model. Affects technique priorities in Phase 2.

`--expand` — include Medium-priority suggestions in the rewritten prompt in addition to High-priority ones.

`--format=<format>` — control output format. Valid values: `report` (default, human-readable sections) or `annotations` (JSON object for CI pipelines or tool consumption).

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

If the prompt spans multiple task types, load the union of files from all matching rows. `structure-techniques/index.md` appears in every row — load it once regardless of how many types match.

**Model-aware priority adjustments (apply after initial scoring):** If `--model` names a non-frontier model (e.g., a smaller or older model), elevate Chain-of-thought and Constraint specification to at least Medium — these techniques have outsized impact on weaker models. Downgrade Tree of Thoughts and Self-consistency to Low — they require strong instruction-following to execute correctly.

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
Incorporate all High-priority suggestions. If `--expand` was passed, also incorporate Medium. Mark every addition to the original prompt in **bold** so the user can see exactly what changed. If there are no High or Medium suggestions, emit: *No suggestions — the prompt is already well-formed for its task type.* Do not produce a rewrite.

---

### Phase 4 — Log

Pipe a JSON object to `log.sh`. Use the skill's base directory as `<base-dir>`:

```bash
echo '{
  "task_type": "...",
  "model": "...",
  "techniques_suggested": [{"priority": "...", "technique": "..."}],
  "rewritten": true
}' | bash "<base-dir>/log.sh"
```

The script appends a timestamped entry to `logs/YYYY-MM-DD.json`, creating the file if it does not exist. The log is gated by `config.json` — if the file is absent or `logging` is false, the script exits silently.

---

### `--format=annotations` output

When `--format=annotations` is passed, emit a single JSON object instead of the default sections:

```json
{
  "current_state": "one or two sentences describing what the prompt does well and its main gap",
  "suggestions": [
    {"priority": "High", "technique": "...", "gap": "...", "how_to_apply": "..."}
  ],
  "rewritten_prompt": "full rewritten prompt text, or null if no suggestions"
}
```

Omit prose. The JSON object is the entire output.

---

## Examples

For worked examples by task type, see `examples/`:
- Transformation task → `examples/example-transformation.md`
- Reasoning task → `examples/example-reasoning.md`
- Context-constrained prompt → `examples/example-context-constrained.md`