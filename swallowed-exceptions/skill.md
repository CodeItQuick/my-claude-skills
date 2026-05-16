---
name: swallowed-exceptions
description: Detect swallowed or silently ignored exceptions in code or pull request diffs. Use when asked to "check for swallowed exceptions", "find silent catches", "review error handling", or as a focused exception-safety pass during PR review. Produces structured findings and high-signal review comments, with explicit suppression rules to avoid noise.
---

# Swallowed Exception Reviewer

Find places where code catches an exception and discards it — silently, or with only cosmetic handling — and produce a high-signal review comment. Optimize for **suppression of weak findings** over coverage — a noisy reviewer is worse than a quiet one.

## Flags

`--format=<format>` — control output format. Valid values: `report` (default, grouped human-readable output for CLI use), `annotations` (one line per finding, `file:line:` prefixed, machine-parseable for CI pipelines or PR review comment automation).

Example CI invocation: `/swallowed-exceptions --format=annotations`

---

## When to use

- Reviewing a PR or diff and the user asks about error handling or exception safety
- Running a focused pass as part of a broader code review
- The user mentions "silent failures", "errors disappearing", "why isn't this logging", or similar runtime mystery symptoms

## Workflow

1. **Get the diff.** If reviewing a PR, run `git diff <base>...HEAD` and focus only on changed lines.
2. **Walk the changed code** looking for the patterns in [`references/detection-patterns.md`](references/detection-patterns.md).
3. **For each candidate**, collect evidence (see Evidence Required below). If you cannot collect at least two pieces of evidence, suppress.
4. **Apply suppression rules** in [`references/suppression-rules.md`](references/suppression-rules.md). When in doubt, suppress.
5. **Emit a structured finding** (JSON, see schema below). This is the source of truth — comments are derived from it.
6. **Generate review comments** only for `high` confidence findings, using the format in [`references/comment-format.md`](references/comment-format.md). Suppress everything below `high`.

## Evidence required

Before reporting a finding, gather **at least two** of:

1. **Catch evidence** — a `catch` block, `.catch(...)` handler, or `try/except` that does not re-throw, propagate, or take a meaningful recovery action.
2. **Scope evidence** — the caught exception is discarded: the binding is unused, assigned to `_`, or only passed to `console.log` / `logger.debug` with no re-throw.
3. **Caller evidence** — the calling code has no other way to learn the operation failed: no return value change, no callback invocation, no out-parameter, no observable side effect.
4. **Context evidence** — the swallowed failure occurs inside a path where silent failure would cause user-visible data loss, incorrect state, or a downstream crash harder to diagnose than the original error.

One piece of evidence alone is too weak. For example, "this catch is empty" is not enough if the operation is provably idempotent and the caller is designed to proceed regardless.

## Finding schema

```json
{
  "skill": "swallowed_exceptions",
  "file": "src/storage.ts",
  "line": 58,
  "expression": "catch (e) {}",
  "claim": "Exception from writeFile() is silently discarded; callers cannot detect the failure",
  "evidence": [
    "catch block body is empty — exception binding `e` is never used",
    "writeFile failure is not communicated to callers via return value or callback",
    "caller at line 72 proceeds to read the file it just failed to write"
  ],
  "confidence": "high",
  "suggested_fix": "Re-throw the error, return a Result/Either type, or at minimum log at error level and document why proceeding is safe."
}
```

## Confidence calibration

| Confidence | Criteria | Action |
|---|---|---|
| `high` | Catch is empty or log-only, and caller proceeds as if the operation succeeded, or silent failure causes incorrect state. | Comment using the format in `comment-format.md`. |
| `medium` | Catch swallows but there is some partial handling (e.g., returns a default). | **Suppress.** Do not comment. |
| `low` | One evidence type, speculative, or the swallow is in clearly optional/best-effort code. | **Suppress.** Do not comment. |

**Default suppression level is `high`.** Only `high` confidence findings are reported. `medium` and `low` are suppressed even if they pass all evidence checks.

## Output format

### `--format=report` (default)

For CLI use. Human-readable output — no JSON. Output two sections in order:

1. **Review comments** — derived from `high` confidence findings only, using the format in [`references/comment-format.md`](references/comment-format.md).
2. **Summary line** — `Found N swallowed exception issues (M reportable after suppression).`

If no findings, output exactly: `No swallowed exception issues detected in the changed code.`

### `--format=annotations`

For CI pipelines and PR review comment automation. Emit a JSON array of findings — always, even if empty — using the finding schema above. No prose, no summary line.

Example:

```json
[
  {
    "skill": "swallowed_exceptions",
    "file": "src/storage.ts",
    "line": 58,
    "expression": "catch (e) {}",
    "claim": "Exception from writeFile() is silently discarded; callers cannot detect the failure",
    "evidence": [
      "catch block body is empty — exception binding `e` is never used",
      "writeFile failure is not communicated via return value or callback"
    ],
    "confidence": "high",
    "suggested_fix": "Re-throw the error, return a Result/Either type, or at minimum log at error level and document why proceeding is safe."
  }
]
```

Suppress `medium` and `low` confidence findings entirely — they do not appear in annotation output. Respect the comment budget: emit at most 5 `high` confidence entries. If candidates exceed the budget, keep the strongest ones.
