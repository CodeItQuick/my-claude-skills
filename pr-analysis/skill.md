---
name: pr-analysis
description: Run thirty-two focused analysis passes across four categories — correctness (null access, swallowed exceptions, suspicious conditionals, mutation of input, implicit boolean coercion, implicit test ordering, input validation, resource lifetime, concurrency and timing, interface contract violations, wrong output), overengineering (boolean flag splitting, passthrough wrappers, speculative generality, unnecessary code growth), maintainability (copy-paste variation, boolean state machine, deep nesting, long parameter list, primitive obsession, feature envy, mixed abstraction levels, document intent, flag debt explicitly, remove clutter, long method, data class), and comprehension (overly clever one-liners, inconsistent abstraction in name, misleading name, complex condition, awkward constructs) — on code or pull request diffs. Use when asked to "analyse this PR", "review for quality", "find issues", or "run a pass over this". Produces structured findings and high-signal review comments, with explicit suppression rules to avoid noise.
---

# PR Analysis

Run thirty-two targeted passes over changed code across correctness, overengineering, maintainability, and comprehension. Optimize for **suppression of weak findings** over coverage — a noisy reviewer is worse than a quiet one.

## Passes

| Category | Pass | What it finds | Detection patterns |
|---|---|---|---|
| correctness | `null-access` | Dereferences of values that may be `null` or `undefined` | [`correctness/null-access.md`](correctness/null-access.md) |
| correctness | `swallowed-exceptions` | Exceptions caught and silently discarded | [`correctness/swallowed-exceptions.md`](correctness/swallowed-exceptions.md) |
| correctness | `suspicious-conditional` | Conditionals that are logically broken, redundant, or always the same value | [`correctness/suspicious-conditional.md`](correctness/suspicious-conditional.md) |
| correctness | `mutation-of-input` | Functions that mutate their arguments, breaking caller expectations | [`correctness/mutation-of-input.md`](correctness/mutation-of-input.md) |
| correctness | `implicit-boolean-coercion` | Truthiness checks on types with surprising falsy members (`0`, `""`, `[]`) that silently exclude valid values | [`correctness/implicit-boolean-coercion.md`](correctness/implicit-boolean-coercion.md) |
| correctness | `implicit-test-ordering` | Tests that silently depend on state created by other tests, making the suite order-sensitive | [`correctness/implicit-test-ordering.md`](correctness/implicit-test-ordering.md) |
| overengineering | `boolean-flag-splitter` | Boolean parameters that divide a function so fundamentally it should be two functions | [`overengineering/boolean-flag-splitter.md`](overengineering/boolean-flag-splitter.md) |
| overengineering | `passthrough-wrapper` | Functions, methods, or classes that only delegate to something else with no added behavior | [`overengineering/passthrough-wrapper.md`](overengineering/passthrough-wrapper.md) |
| overengineering | `speculative-generality` | Structure added for future requirements that do not yet exist — unused type parameters, single-subclass abstractions, extension points with no consumers, optional parameters never varied from their default | [`overengineering/speculative-generality.md`](overengineering/speculative-generality.md) |
| overengineering | `unnecessary-code-growth` | Reachable but never-exercised code — branches for conditions current inputs cannot satisfy, options always at their default, exported functions with zero consumers, error handlers for errors that cannot occur | [`overengineering/unnecessary-code-growth.md`](overengineering/unnecessary-code-growth.md) |
| maintainability | `copy-paste-variation` | Two or more blocks with identical structure varying only in a value or field name, creating change coupling where a logic fix must be applied to every copy | [`maintainability/copy-paste-variation.md`](maintainability/copy-paste-variation.md) |
| maintainability | `boolean-state-machine` | Multiple coordinated booleans tracking a lifecycle where invalid combinations are possible and a typed enum would make valid states explicit | [`maintainability/boolean-state-machine.md`](maintainability/boolean-state-machine.md) |
| maintainability | `deep-nesting` | Control flow indented four or more levels deep where early returns, extraction, or guard clauses would flatten the structure | [`maintainability/deep-nesting.md`](maintainability/deep-nesting.md) |
| maintainability | `long-parameter-list` | Functions with five or more positional parameters where an options object would prevent transpositions and reduce call-site burden | [`maintainability/long-parameter-list.md`](maintainability/long-parameter-list.md) |
| maintainability | `primitive-obsession` | Raw strings or numbers used where a small domain type would add safety and prevent misuse | [`maintainability/primitive-obsession.md`](maintainability/primitive-obsession.md) |
| maintainability | `feature-envy` | Functions or methods more interested in another module's data than their own, suggesting they belong elsewhere | [`maintainability/feature-envy.md`](maintainability/feature-envy.md) |
| maintainability | `mixed-abstraction-levels` | Functions that mix high-level business intent with low-level mechanics in the same body | [`maintainability/mixed-abstraction-levels.md`](maintainability/mixed-abstraction-levels.md) |
| maintainability | `document-intent` | Magic values, undocumented side effects, non-obvious algorithms, and workarounds with no stated rationale — code that forces a reader to look up or re-derive what the author already knew | [`maintainability/document-intent.md`](maintainability/document-intent.md) |
| maintainability | `flag-debt-explicitly` | Technical debt introduced or left without tracking — TODOs with no ticket, FIXMEs with no explanation, disabled tests with no reason, and type suppressions with no comment | [`maintainability/flag-debt-explicitly.md`](maintainability/flag-debt-explicitly.md) |
| maintainability | `remove-clutter` | Noise without information — dead code after unconditional control flow, commented-out blocks, unused declarations, and comments that restate what the code already clearly says | [`maintainability/remove-clutter.md`](maintainability/remove-clutter.md) |
| maintainability | `long-method` | Functions that handle multiple distinct concerns inline — validate + transform + persist + notify as one body — where named extraction would make each concern independently readable and testable | [`maintainability/long-method.md`](maintainability/long-method.md) |
| maintainability | `data-class` | Classes that hold data but implement no behavior, leaving operations scattered across external functions that are repeatedly envious of the class's fields | [`maintainability/data-class.md`](maintainability/data-class.md) |
| comprehension | `overly-clever-one-liner` | Expressions compressed to the point where two or three named lines would be immediately clearer | [`comprehension/overly-clever-one-liner.md`](comprehension/overly-clever-one-liner.md) |
| comprehension | `inconsistent-abstraction-in-name` | Names that mix vocabulary from incompatible abstraction levels — business terms alongside infrastructure terms, or implementation detail encoded in a name where intent belongs | [`comprehension/inconsistent-abstraction-in-name.md`](comprehension/inconsistent-abstraction-in-name.md) |
| comprehension | `misleading-name` | Names whose implicit contract is violated by the implementation — query-named functions that mutate, booleans named for their inverse, identifiers omitting load-bearing units, names promising one concern but the function does several | [`comprehension/misleading-name.md`](comprehension/misleading-name.md) |
| comprehension | `complex-condition` | Boolean expressions that are cognitively expensive to evaluate — double negatives, four-or-more-clause predicates, De Morgan violations, and flag variables whose name does not communicate the loop's exit condition | [`comprehension/complex-condition.md`](comprehension/complex-condition.md) |
| comprehension | `awkward-construct` | Verbose or indirect patterns where a more direct idiom exists — nested `.then()` chains that should be `async/await`, manual accumulation loops that should be `.map()`/`.filter()`, `&&` navigation chains that should be optional chaining, `Object.keys` re-indexing that should be `Object.entries`, string concatenation that should be a template literal | [`comprehension/awkward-construct.md`](comprehension/awkward-construct.md) |
| correctness | `input-validation` | Missing or incomplete validation of inputs at system boundaries — unguarded bounds, unsanitized strings, `parseInt` without NaN guard, type assertions on external data | [`correctness/input-validation.md`](correctness/input-validation.md) |
| correctness | `resource-lifetime` | Resources acquired but not reliably released — file handles, connections, timers, and listeners that leak when an error path is taken | [`correctness/resource-lifetime.md`](correctness/resource-lifetime.md) |
| correctness | `concurrency-and-timing` | Race conditions, stale state, and ordering hazards — read-modify-write across `await`, callbacks closing over changed state, unawaited promises, check-then-act on shared state | [`correctness/concurrency-and-timing.md`](correctness/concurrency-and-timing.md) |
| correctness | `interface-contract-violation` | Misuse of APIs and library interfaces — wrong argument order, unawaited async calls, deprecated APIs with changed semantics, Node-style callback parameter confusion | [`correctness/interface-contract-violation.md`](correctness/interface-contract-violation.md) |
| correctness | `wrong-output` | Functions that return incorrect values or throw the wrong exception type — implicit `undefined`, success masked in a catch block, generic `Error` where typed errors are expected | [`correctness/wrong-output.md`](correctness/wrong-output.md) |

## Flags

`--format=<format>` — control output format. Valid values: `report` (default, grouped human-readable output for CLI use), `annotations` (a JSON array of finding objects, one element per finding, machine-parseable for CI pipelines or PR review comment automation).

`--category=<category>` — run all passes in one category instead of all thirty-two. Valid values: `correctness`, `overengineering`, `maintainability`, `comprehension`. Example: `/pr-analysis --category=correctness` runs the eleven correctness passes only.

`--pass=<pass>` — run exactly one pass. Valid values: any pass name from the table above. Example: `/pr-analysis --pass=null-access`. Takes precedence over `--category` if both are supplied.

---

## When to use

- Reviewing a PR or diff for any quality concern — bugs, design issues, readability, or maintainability
- The user mentions a runtime error, silent failure, logic bug, overengineering, hard-to-read code, or naming problems
- Running all passes: `/pr-analysis`
- Focusing on one category: `/pr-analysis --category=correctness`, `--category=overengineering`, `--category=maintainability`, `--category=comprehension`
- Running a single pass: `/pr-analysis --pass=null-access`

## Workflow

1. **Get the diff.** Run `git diff <base>...HEAD` and focus only on changed lines.
2. **Determine which passes to run.** If `--pass` is specified, run only that pass. If `--category` is specified, run only the passes in that category. Otherwise run all thirty-two in order. For each pass, walk the changed code looking for the patterns in the corresponding file in the category folder.
3. **For each candidate, complete this checklist before proceeding. If any box cannot be checked, STOP — do not report this finding.**
   - [ ] Evidence type 1 present: ___ (name the evidence type and quote the code)
   - [ ] Evidence type 2 present: ___ (name the evidence type and quote the code)
   - [ ] Suppression rules checked — shared rules ([`shared/suppression-rules.md`](shared/suppression-rules.md)) and category rules ([`correctness/suppression-rules.md`](correctness/suppression-rules.md), [`overengineering/suppression-rules.md`](overengineering/suppression-rules.md), [`maintainability/suppression-rules.md`](maintainability/suppression-rules.md), [`comprehension/suppression-rules.md`](comprehension/suppression-rules.md)) reviewed and none apply: ___

4. **Declare confidence explicitly before generating any comment. If confidence is not `high`, STOP — do not generate a comment.**
   ```
   Confidence: [high / medium / low]
   Reason: [one sentence citing the specific evidence that justifies this level]
   ```
   A finding is `high` only when two or more evidence types are present and the failure path is concrete and demonstrable. `medium` or `low` must be suppressed — do not rationalize them upward.

5. **Emit a structured finding** (JSON, see schema below). This is the source of truth — comments are derived from it.

6. **Generate review comments** only for `high` confidence findings, using the format in [`shared/comment-format.md`](shared/comment-format.md). Each comment must include a one-sentence suppression justification stating which suppression rules were considered and why none applied. Format:
   > *Suppression check: [rule names checked] — none apply because [reason].*

## Finding schema

One JSON object per line (JSONL). Each finding is a single line — no array wrapper, no trailing commas between objects.

```jsonl
{"skill":"pr_analysis","category":"correctness","pass":"null-access","file":"src/users.ts","line":42,"expression":"user.name","claim":"user.name may throw because users.find(...) can return undefined","evidence":["users.find(...) returns User | undefined","no guard between assignment at line 41 and dereference at line 42","an unreachable guard exists at line 47"],"confidence":"high","severity":"blocking","suggested_fix":"Guard `user` before reading `name`, throw a domain error, or use `?? defaultUser`."}
```

## Confidence calibration

| Confidence | Criteria | Action |
|---|---|---|
| `high` | Two or more evidence types present, failure path is concrete and demonstrable. | Comment as `Blocking:` or `Suggested:`. |
| `medium` | Two evidence types present, plausible failure path, but alternative interpretations exist. | **Suppress.** Do not comment. |
| `low` | One evidence type, speculative, or the pattern is clearly defensive/intentional. | **Suppress.** Do not comment. |

## Output format

### `--format=report` (default)

For CLI use. Human-readable output — no JSON. Group findings by pass, then output:

1. **Review comments** — derived from `high` confidence findings only, using the format in [`shared/comment-format.md`](shared/comment-format.md).
2. **Summary table** — after all comments, output a markdown table with one row per reported finding:

   | # | Pass | File | Line | Severity | Summary |
   |---|---|---|---|---|---|
   | 1 | `pass-name` | `file.cs` | 42 | Blocking | One-sentence description of the issue |

3. **Summary line** — `Found N issues across M passes (P reportable after suppression).`

If no findings across all passes, output exactly: `No issues detected in the changed code.`

### `--format=annotations`

For CI pipelines and PR review comment automation. Emit one JSON object per line (JSONL) — one finding per line, no array wrapper, no trailing commas. When there are no findings, emit nothing (no output at all — not an empty array, not a placeholder line). No prose, no summary line.

> **Format note:** Prior to the JSONL format, this flag emitted a single JSON array (`[{...}, {...}]`). Consumers that call `JSON.parse(output)` expecting an array must be updated to read one line at a time instead.

Example:

```jsonl
{"skill":"pr_analysis","category":"correctness","pass":"null-access","file":"src/users.ts","line":42,"expression":"user.name","claim":"user.name may throw because users.find(...) can return undefined","evidence":["users.find(...) returns User | undefined","no guard between assignment at line 41 and dereference at line 42"],"confidence":"high","severity":"blocking","suggested_fix":"Guard `user` before reading `name`, throw a domain error, or use `?? defaultUser`."}
{"skill":"pr_analysis","category":"correctness","pass":"swallowed-exceptions","file":"src/storage.ts","line":58,"expression":"catch (e) {}","claim":"Exception from writeFile() is silently discarded; callers cannot detect the failure","evidence":["catch block body is empty — exception binding `e` is never used","writeFile failure is not communicated via return value or callback"],"confidence":"high","severity":"blocking","suggested_fix":"Re-throw the error, return a Result/Either type, or at minimum log at error level and document why proceeding is safe."}
```

Suppress `low` confidence findings entirely.