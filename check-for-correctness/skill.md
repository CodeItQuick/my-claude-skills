---
name: check-for-correctness
description: Run seven focused correctness passes — null/undefined access, swallowed exceptions, suspicious conditionals, mutation of input, boolean flag splitting, passthrough wrappers, and implicit test ordering — on code or pull request diffs. Use when asked to "check for correctness", "find bugs", "review for correctness", or "run a correctness pass". Produces structured findings and high-signal review comments, with explicit suppression rules to avoid noise.
---

# Correctness Reviewer

Run seven targeted passes over changed code and produce high-signal review comments. Optimize for **suppression of weak findings** over coverage — a noisy reviewer is worse than a quiet one.

## Passes

| Pass | What it finds | Detection patterns |
|---|---|---|
| `null-access` | Dereferences of values that may be `null` or `undefined` | [`references/detection-patterns/null-access.md`](references/detection-patterns/null-access.md) |
| `swallowed-exceptions` | Exceptions caught and silently discarded | [`references/detection-patterns/swallowed-exceptions.md`](references/detection-patterns/swallowed-exceptions.md) |
| `suspicious-conditional` | Conditionals that are logically broken, redundant, or always the same value | [`references/detection-patterns/suspicious-conditional.md`](references/detection-patterns/suspicious-conditional.md) |
| `mutation-of-input` | Functions that mutate their arguments, breaking caller expectations | [`references/detection-patterns/mutation-of-input.md`](references/detection-patterns/mutation-of-input.md) |
| `boolean-flag-splitter` | Boolean parameters that divide a function so fundamentally it should be two functions | [`references/detection-patterns/boolean-flag-splitter.md`](references/detection-patterns/boolean-flag-splitter.md) |
| `passthrough-wrapper` | Functions, methods, or classes that only delegate to something else with no added behavior | [`references/detection-patterns/passthrough-wrapper.md`](references/detection-patterns/passthrough-wrapper.md) |
| `implicit-test-ordering` | Tests that silently depend on state created by other tests, making the suite order-sensitive | [`references/detection-patterns/implicit-test-ordering.md`](references/detection-patterns/implicit-test-ordering.md) |

To run a single pass, specify it: `/check-for-correctness null-access`

## Flags

`--format=<format>` — control output format. Valid values: `report` (default, grouped human-readable output for CLI use), `annotations` (one line per finding, `file:line:` prefixed, machine-parseable for CI pipelines or PR review comment automation).

---

## When to use

- Reviewing a PR or diff and the user asks for a general correctness check
- The user mentions a runtime error, silent failure, or logic bug without specifying type
- Running as one phase of a broader code review

## Workflow

1. **Get the diff.** Run `git diff <base>...HEAD` and focus only on changed lines.
2. **Run each pass in order.** For each pass, walk the changed code looking for the patterns in the corresponding detection-patterns file.
3. **For each candidate**, collect evidence (see Evidence Required per pass below). If you cannot collect at least two pieces of evidence, suppress.
4. **Apply suppression rules** from [`references/suppression-rules.md`](references/suppression-rules.md). When in doubt, suppress.
5. **Emit a structured finding** (JSON, see schema below). This is the source of truth — comments are derived from it.
6. **Generate review comments** only for `high` confidence or strong `medium` findings, using the format in [`references/comment-format.md`](references/comment-format.md).

## Evidence required (per pass)

Gather **at least two** of the evidence types for the active pass before reporting:

### `null-access`
1. **Type evidence** — the type allows `null` or `undefined` (optional property, return type with `| undefined`, no narrowing in scope).
2. **Source evidence** — the value comes from `.find(...)`, `Map.get(...)`, index lookup, cache/database/API.
3. **Guard placement** — no guard exists, or the guard appears *after* the dereference.
4. **Convention evidence** — nearby code already treats this value as nullable.

### `swallowed-exceptions`
1. **Catch evidence** — a `catch` block or `.catch(...)` that does not re-throw, propagate, or take a meaningful recovery action.
2. **Scope evidence** — the caught exception is discarded: binding unused, named `_`, or only passed to `console.log`/`logger.debug` with no re-throw.
3. **Caller evidence** — the calling code has no other way to learn the operation failed.
4. **Context evidence** — silent failure would cause user-visible data loss, incorrect state, or a downstream crash harder to diagnose than the original error.

### `suspicious-conditional`
1. **Logic evidence** — the condition is provably tautological, contradictory, or identical to another branch given the types and values in scope.
2. **Type evidence** — the type makes the comparison degenerate (non-nullable compared to `null`, `boolean` compared to `"true"`, wrong boundary for the stated invariant).
3. **Behavioral evidence** — the branch body is empty, unreachable, or identical to the else branch, confirming the condition has no effect.
4. **Convention evidence** — nearby code uses the correct operator or boundary, making the candidate an inconsistency.

### `mutation-of-input`
1. **Mutation evidence** — a mutating operation (`=` on a property, `sort`/`reverse`/`splice`/`push` on an array, `delete` on a property) is applied directly to a parameter or a shallow copy of one.
2. **Caller evidence** — the caller has no indication mutation will occur: the function name implies a pure transformation, the parameter type is not a builder/accumulator, and the return value is the same reference passed in.
3. **Alias evidence** — the caller retains a reference to the passed value and uses it after the call, meaning the mutation is observable.
4. **Convention evidence** — sibling functions handling the same type return new values, making this function an inconsistency.

### `boolean-flag-splitter`
1. **Branch evidence** — the boolean parameter controls an `if`/`else` whose two branches differ in return type, side effects, or core logic — not just a minor variation in output.
2. **Caller evidence** — every call site passes a literal `true` or `false` (never a variable), meaning callers have made a static decision and the flag is standing in for two distinct function names.
3. **Divergence evidence** — the two branches share little code: different I/O, different return shapes, or side effects present in one branch but absent in the other.
4. **Threading evidence** — the boolean is passed through one or more intermediate functions that do not use it directly, indicating the split is not local to a single decision point.

### `passthrough-wrapper`
1. **Delegation evidence** — the function, method, or class body contains only a call to another function/method and returns its result without modification.
2. **Signature evidence** — the wrapper's parameters map 1:1 to the callee's parameters with no reordering, merging, splitting, defaulting, or validation.
3. **Behavior evidence** — no logging, metrics, error translation, access control, or other cross-cutting concern is added; the wrapper is invisible at runtime.
4. **Substitutability evidence** — callers could import and call the wrapped target directly without any change to their logic, types, or error handling.

### `implicit-test-ordering`
1. **Shared state evidence** — a variable, object, database record, cache entry, or singleton is written by one test and read by another with no intervening reset or recreation.
2. **Missing arrange evidence** — a test has no setup for data or state it clearly requires, meaning that state must have been produced by a prior test.
3. **Mutation evidence** — a `beforeAll` or module-level object is mutated by one or more tests rather than recreated fresh per test, making each test's starting conditions depend on execution order.
4. **Ordering signal evidence** — test names use sequential numbering, step language, or lifecycle terms ("step 1", "then", "after") implying a required order that the test runner does not enforce.

## Finding schema

```json
{
  "skill": "check_for_correctness",
  "pass": "null-access",
  "file": "src/users.ts",
  "line": 42,
  "expression": "user.name",
  "claim": "user.name may throw because users.find(...) can return undefined",
  "evidence": [
    "users.find(...) returns User | undefined",
    "no guard between assignment at line 41 and dereference at line 42",
    "an unreachable guard exists at line 47"
  ],
  "confidence": "high",
  "severity": "blocking",
  "suggested_fix": "Guard `user` before reading `name`, throw a domain error, or use `?? defaultUser`."
}
```

## Confidence calibration

| Confidence | Criteria | Action |
|---|---|---|
| `high` | Two or more evidence types present, failure path is concrete and demonstrable. | Comment as `Blocking:` or `Suggested:`. |
| `medium` | Two evidence types present, plausible failure path, but alternative interpretations exist. | Comment as `Suggested:` phrased as a question. |
| `low` | One evidence type, speculative, or the pattern is clearly defensive/intentional. | **Suppress.** Do not comment. |

## Comment budget

Per review pass (across all three correctness passes combined), post at most:
- **3** blocking comments
- **8** total comments

Within the budget, prefer findings that span multiple passes over several findings from a single pass. If you have more candidates than the budget, keep the highest-confidence ones and drop the rest. Do not add a "see also" list of suppressed candidates — it defeats the budget.

## Output format

### `--format=report` (default)

For CLI use. Human-readable output — no JSON. Group findings by pass, then output:

1. **Review comments** — derived from `high` and strong `medium` findings, using the format in [`references/comment-format.md`](references/comment-format.md).
2. **Summary line** — `Found N correctness issues across M passes (P reportable after suppression).`

If no findings across all passes, output exactly: `No correctness issues detected in the changed code.`

### `--format=annotations`

For CI pipelines and PR review comment automation. Emit a single JSON array of findings from all passes — always, even if empty. No prose, no summary line.

Example:

```json
[
  {
    "skill": "check_for_correctness",
    "pass": "null-access",
    "file": "src/users.ts",
    "line": 42,
    "expression": "user.name",
    "claim": "user.name may throw because users.find(...) can return undefined",
    "evidence": [
      "users.find(...) returns User | undefined",
      "no guard between assignment at line 41 and dereference at line 42"
    ],
    "confidence": "high",
    "severity": "blocking",
    "suggested_fix": "Guard `user` before reading `name`, throw a domain error, or use `?? defaultUser`."
  },
  {
    "skill": "check_for_correctness",
    "pass": "swallowed-exceptions",
    "file": "src/storage.ts",
    "line": 58,
    "expression": "catch (e) {}",
    "claim": "Exception from writeFile() is silently discarded; callers cannot detect the failure",
    "evidence": [
      "catch block body is empty — exception binding `e` is never used",
      "writeFile failure is not communicated via return value or callback"
    ],
    "confidence": "high",
    "severity": "blocking",
    "suggested_fix": "Re-throw the error, return a Result/Either type, or at minimum log at error level and document why proceeding is safe."
  }
]
```

Suppress `low` confidence findings entirely. Respect the comment budget: emit at most 3 `blocking` entries and 8 total entries. If candidates exceed the budget, keep the highest-confidence ones.