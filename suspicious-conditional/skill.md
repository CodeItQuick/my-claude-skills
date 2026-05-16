---
name: suspicious-conditional
description: Detect logically broken, redundant, or always-true/false conditionals in code or pull request diffs. Use when asked to "check for bad conditions", "find dead branches", "review conditionals", or as a focused logic-correctness pass during PR review. Produces structured findings and high-signal review comments, with explicit suppression rules to avoid noise.
---

# Suspicious Conditional Reviewer

Find places where a conditional expression is logically wrong, redundant, or can never change the program's outcome — and produce a high-signal review comment. Optimize for **suppression of weak findings** over coverage — a noisy reviewer is worse than a quiet one.

## Flags

`--format=<format>` — control output format. Valid values: `report` (default, grouped human-readable output for CLI use), `annotations` (one line per finding, `file:line:` prefixed, machine-parseable for CI pipelines or PR review comment automation).

Example CI invocation: `/suspicious-conditional --format=annotations`

---

## When to use

- Reviewing a PR or diff and the user asks about logic correctness or dead code
- Running a focused conditional-safety pass as part of a broader code review
- The user mentions "branch never taken", "always true", "condition looks wrong", or "off by one"

## Workflow

1. **Get the diff.** If reviewing a PR, run `git diff <base>...HEAD` and focus only on changed lines.
2. **Walk the changed code** looking for the patterns in [`references/detection-patterns.md`](references/detection-patterns.md).
3. **For each candidate**, collect evidence (see Evidence Required below). If you cannot collect at least two pieces of evidence, suppress.
4. **Apply suppression rules** in [`references/suppression-rules.md`](references/suppression-rules.md). When in doubt, suppress.
5. **Emit a structured finding** (JSON, see schema below). This is the source of truth — comments are derived from it.
6. **Generate review comments** only for `high` confidence or strong `medium` findings, using the format in [`references/comment-format.md`](references/comment-format.md).

## Evidence required

Before reporting a finding, gather **at least two** of:

1. **Logic evidence** — the condition is provably tautological, contradictory, or identical to another branch in the same chain, given the types and values in scope.
2. **Type evidence** — the type of one or both operands makes the comparison degenerate: comparing a non-nullable value to `null`, comparing a `boolean` to `"true"`, comparing a number with the wrong boundary for the stated invariant.
3. **Behavioral evidence** — removing or inverting the condition would change observable behavior, yet the branch body is empty, unreachable, or identical to the else branch — confirming the condition has no effect.
4. **Convention evidence** — nearby code in the same file uses the correct operator or boundary, making the candidate stand out as an inconsistency.

One piece of evidence alone is too weak. For example, "this condition looks redundant" is not enough without at least one corroborating signal from types, behavior, or convention.

## Finding schema

```json
{
  "skill": "suspicious_conditional",
  "file": "src/auth.ts",
  "line": 37,
  "expression": "if (retries > MAX_RETRIES)",
  "claim": "Should be >= MAX_RETRIES; the loop runs one extra iteration because > skips the boundary value",
  "evidence": [
    "MAX_RETRIES is 3; with >, the loop executes on retries = 3 before the condition triggers",
    "the sibling function retryWithDelay uses >= MAX_RETRIES for the same invariant",
    "the loop body mutates state on each iteration, so the extra iteration is not a no-op"
  ],
  "confidence": "high",
  "severity": "blocking",
  "suggested_fix": "Change `>` to `>=` to match the MAX_RETRIES boundary semantics used elsewhere."
}
```

## Confidence calibration

| Confidence | Criteria | Action |
|---|---|---|
| `high` | The condition is provably tautological or contradictory given the types in scope, or two or more evidence types confirm the logic error. | Comment as `Blocking:` or `Suggested:`. |
| `medium` | Two evidence types present, plausible logic error, but alternative interpretations exist. | Comment as `Suggested:` phrased as a question. |
| `low` | One evidence type, speculative, or the condition may reflect intentional defensive programming. | **Suppress.** Do not comment. |

## Comment budget

Per review pass, post at most:
- **3** blocking comments from this skill
- **5** total comments from this skill

If you have more candidates than the budget, keep the highest-confidence ones and drop the rest. Do not add a "see also" list of suppressed candidates — it defeats the budget.

## Output format

### `--format=report` (default)

For CLI use. Human-readable output — no JSON. Output two sections in order:

1. **Review comments** — derived from `high` and strong `medium` findings, using the format in [`references/comment-format.md`](references/comment-format.md).
2. **Summary line** — `Found N suspicious conditional issues (M reportable after suppression).`

If no findings, output exactly: `No suspicious conditional issues detected in the changed code.`

### `--format=annotations`

For CI pipelines and PR review comment automation. Emit a JSON array of findings — always, even if empty — using the finding schema above. No prose, no summary line.

Example:

```json
[
  {
    "skill": "suspicious_conditional",
    "file": "src/auth.ts",
    "line": 37,
    "expression": "if (retries > MAX_RETRIES)",
    "claim": "Should be >= MAX_RETRIES; the loop runs one extra iteration because > skips the boundary value",
    "evidence": [
      "MAX_RETRIES is 3; with >, the loop executes on retries = 3 before the condition triggers",
      "the sibling function retryWithDelay uses >= MAX_RETRIES for the same invariant"
    ],
    "confidence": "high",
    "severity": "blocking",
    "suggested_fix": "Change `>` to `>=` to match the MAX_RETRIES boundary semantics used elsewhere."
  }
]
```

Suppress `low` confidence findings entirely — they do not appear in annotation output. Respect the comment budget: emit at most 3 `blocking` entries and 5 total entries. If candidates exceed the budget, keep the highest-confidence ones.