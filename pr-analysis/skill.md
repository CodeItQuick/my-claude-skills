---
name: pr-analysis
description: Run twenty-nine focused analysis passes across four categories — correctness (null access, swallowed exceptions, suspicious conditionals, mutation of input, implicit boolean coercion, implicit test ordering, input validation, resource lifetime, concurrency and timing, interface contract violations, wrong output), overengineering (boolean flag splitting, passthrough wrappers), maintainability (copy-paste variation, boolean state machine, deep nesting, long parameter list, primitive obsession, feature envy, mixed abstraction levels, document intent, flag debt explicitly, remove clutter, long method, data class), and comprehension (overly clever one-liners, inconsistent abstraction in name, misleading name, complex condition) — on code or pull request diffs. Use when asked to "analyse this PR", "review for quality", "find issues", or "run a pass over this". Produces structured findings and high-signal review comments, with explicit suppression rules to avoid noise.
---

# PR Analysis

Run twenty-nine targeted passes over changed code across correctness, overengineering, maintainability, and comprehension. Optimize for **suppression of weak findings** over coverage — a noisy reviewer is worse than a quiet one.

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
| maintainability | `copy-paste-variation` | Two or more blocks with identical structure varying only in a value or field name, creating change coupling where a logic fix must be applied to every copy | [`maintainability/copy-paste-variation.md`](maintainability/copy-paste-variation.md) |
| maintainability | `boolean-state-machine` | Multiple coordinated booleans tracking a lifecycle where invalid combinations are possible and a typed enum would make valid states explicit | [`maintainability/boolean-state-machine.md`](maintainability/boolean-state-machine.md) |
| maintainability | `deep-nesting` | Control flow indented four or more levels deep where early returns, extraction, or guard clauses would flatten the structure | [`maintainability/deep-nesting.md`](maintainability/deep-nesting.md) |
| maintainability | `long-parameter-list` | Functions with five or more positional parameters where an options object would prevent transpositions and reduce call-site burden | [`maintainability/long-parameter-list.md`](maintainability/long-parameter-list.md) |
| maintainability | `primitive-obsession` | Raw strings or numbers used where a small domain type would add safety and prevent misuse | [`maintainability/primitive-obsession.md`](maintainability/primitive-obsession.md) |
| maintainability | `feature-envy` | Functions or methods more interested in another module's data than their own, suggesting they belong elsewhere | [`maintainability/feature-envy.md`](maintainability/feature-envy.md) |
| maintainability | `mixed-abstraction-levels` | Functions that mix high-level business intent with low-level mechanics in the same body | [`maintainability/mixed-abstraction-levels.md`](maintainability/mixed-abstraction-levels.md) |
| comprehension | `overly-clever-one-liner` | Expressions compressed to the point where two or three named lines would be immediately clearer | [`comprehension/overly-clever-one-liner.md`](comprehension/overly-clever-one-liner.md) |
| comprehension | `inconsistent-abstraction-in-name` | Names that mix vocabulary from incompatible abstraction levels — business terms alongside infrastructure terms, or implementation detail encoded in a name where intent belongs | [`comprehension/inconsistent-abstraction-in-name.md`](comprehension/inconsistent-abstraction-in-name.md) |
| comprehension | `misleading-name` | Names whose implicit contract is violated by the implementation — query-named functions that mutate, booleans named for their inverse, identifiers omitting load-bearing units, names promising one concern but the function does several | [`comprehension/misleading-name.md`](comprehension/misleading-name.md) |
| comprehension | `complex-condition` | Boolean expressions that are cognitively expensive to evaluate — double negatives, four-or-more-clause predicates, De Morgan violations, and flag variables whose name does not communicate the loop's exit condition | [`comprehension/complex-condition.md`](comprehension/complex-condition.md) |
| correctness | `input-validation` | Missing or incomplete validation of inputs at system boundaries — unguarded bounds, unsanitized strings, `parseInt` without NaN guard, type assertions on external data | [`correctness/input-validation.md`](correctness/input-validation.md) |
| correctness | `resource-lifetime` | Resources acquired but not reliably released — file handles, connections, timers, and listeners that leak when an error path is taken | [`correctness/resource-lifetime.md`](correctness/resource-lifetime.md) |
| correctness | `concurrency-and-timing` | Race conditions, stale state, and ordering hazards — read-modify-write across `await`, callbacks closing over changed state, unawaited promises, check-then-act on shared state | [`correctness/concurrency-and-timing.md`](correctness/concurrency-and-timing.md) |
| correctness | `interface-contract-violation` | Misuse of APIs and library interfaces — wrong argument order, unawaited async calls, deprecated APIs with changed semantics, Node-style callback parameter confusion | [`correctness/interface-contract-violation.md`](correctness/interface-contract-violation.md) |
| correctness | `wrong-output` | Functions that return incorrect values or throw the wrong exception type — implicit `undefined`, success masked in a catch block, generic `Error` where typed errors are expected | [`correctness/wrong-output.md`](correctness/wrong-output.md) |
| maintainability | `document-intent` | Magic values, undocumented side effects, non-obvious algorithms, and workarounds with no stated rationale — code that forces a reader to look up or re-derive what the author already knew | [`maintainability/document-intent.md`](maintainability/document-intent.md) |
| maintainability | `flag-debt-explicitly` | Technical debt introduced or left without tracking — TODOs with no ticket, FIXMEs with no explanation, disabled tests with no reason, and type suppressions with no comment | [`maintainability/flag-debt-explicitly.md`](maintainability/flag-debt-explicitly.md) |
| maintainability | `remove-clutter` | Noise without information — dead code after unconditional control flow, commented-out blocks, unused declarations, and comments that restate what the code already clearly says | [`maintainability/remove-clutter.md`](maintainability/remove-clutter.md) |
| maintainability | `long-method` | Functions that handle multiple distinct concerns inline — validate + transform + persist + notify as one body — where named extraction would make each concern independently readable and testable | [`maintainability/long-method.md`](maintainability/long-method.md) |
| maintainability | `data-class` | Classes that hold data but implement no behavior, leaving operations scattered across external functions that are repeatedly envious of the class's fields | [`maintainability/data-class.md`](maintainability/data-class.md) |

## Flags

`--format=<format>` — control output format. Valid values: `report` (default, grouped human-readable output for CLI use), `annotations` (a JSON array of finding objects, one element per finding, machine-parseable for CI pipelines or PR review comment automation).

`--category=<category>` — run all passes in one category instead of all twenty-nine. Valid values: `correctness`, `overengineering`, `maintainability`, `comprehension`. Example: `/pr-analysis --category=correctness` runs the eleven correctness passes only.

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
2. **Determine which passes to run.** If `--pass` is specified, run only that pass. If `--category` is specified, run only the passes in that category. Otherwise run all twenty-nine in order. For each pass, walk the changed code looking for the patterns in the corresponding file in the category folder.
3. **For each candidate**, collect evidence (see Evidence Required per pass below). If you cannot collect at least two pieces of evidence, suppress.
4. **Apply suppression rules.** Start with [`shared/suppression-rules.md`](shared/suppression-rules.md), then the category file for the active pass: [`correctness/suppression-rules.md`](correctness/suppression-rules.md), [`overengineering/suppression-rules.md`](overengineering/suppression-rules.md), [`maintainability/suppression-rules.md`](maintainability/suppression-rules.md), or [`comprehension/suppression-rules.md`](comprehension/suppression-rules.md). When in doubt, suppress.
5. **Emit a structured finding** (JSON, see schema below). This is the source of truth — comments are derived from it.
6. **Generate review comments** only for `high` confidence or strong `medium` findings, using the format in [`shared/comment-format.md`](shared/comment-format.md).

## Evidence required (per pass)

Gather **at least two** of the evidence types for the active pass before reporting:

### Correctness

#### `null-access`
1. **Type evidence** — the type allows `null` or `undefined` (optional property, return type with `| undefined`, no narrowing in scope).
2. **Source evidence** — the value comes from `.find(...)`, `Map.get(...)`, index lookup, cache/database/API.
3. **Guard placement** — no guard exists, or the guard appears *after* the dereference.
4. **Convention evidence** — nearby code already treats this value as nullable.

#### `swallowed-exceptions`
1. **Catch evidence** — a `catch` block or `.catch(...)` that does not re-throw, propagate, or take a meaningful recovery action.
2. **Scope evidence** — the caught exception is discarded: binding unused, named `_`, or only passed to `console.log`/`logger.debug` with no re-throw.
3. **Caller evidence** — the calling code has no other way to learn the operation failed.
4. **Context evidence** — silent failure would cause user-visible data loss, incorrect state, or a downstream crash harder to diagnose than the original error.

#### `suspicious-conditional`
1. **Logic evidence** — the condition is provably tautological, contradictory, or identical to another branch given the types and values in scope.
2. **Type evidence** — the type makes the comparison degenerate (non-nullable compared to `null`, `boolean` compared to `"true"`, wrong boundary for the stated invariant).
3. **Behavioral evidence** — the branch body is empty, unreachable, or identical to the else branch, confirming the condition has no effect.
4. **Convention evidence** — nearby code uses the correct operator or boundary, making the candidate an inconsistency.

#### `mutation-of-input`
1. **Mutation evidence** — a mutating operation (`=` on a property, `sort`/`reverse`/`splice`/`push` on an array, `delete` on a property) is applied directly to a parameter or a shallow copy of one.
2. **Caller evidence** — the caller has no indication mutation will occur: the function name implies a pure transformation, the parameter type is not a builder/accumulator, and the return value is the same reference passed in.
3. **Alias evidence** — the caller retains a reference to the passed value and uses it after the call, meaning the mutation is observable.
4. **Convention evidence** — sibling functions handling the same type return new values, making this function an inconsistency.

#### `implicit-boolean-coercion`
1. **Type evidence** — the value being coerced to boolean has a type that includes a falsy-but-valid member: `number` (zero is falsy), `string` (empty string is falsy), an array or object (always truthy — check is meaningless), or a union that includes `false` where `undefined` was the intended exclusion.
2. **Semantic evidence** — the falsy member the guard would exclude (`0`, `""`, `false`) is a plausible and valid value in the domain: zero quantity, empty search query, explicit false toggle, zero-based index.
3. **Operator evidence** — `||` is used for a default where `??` would be correct, or `.filter(Boolean)` is used on an array whose element type includes `0`, `""`, or `false`, or JSX uses `{count && ...}` where `count` is typed as `number`.
4. **Convention evidence** — nearby code uses explicit null checks (`!= null`, `!== undefined`, `=== null`) for similar values, making the bare truthiness check an inconsistency.

#### `implicit-test-ordering`
1. **Shared state evidence** — a variable, object, database record, cache entry, or singleton is written by one test and read by another with no intervening reset or recreation.
2. **Missing arrange evidence** — a test has no setup for data or state it clearly requires, meaning that state must have been produced by a prior test.
3. **Mutation evidence** — a `beforeAll` or module-level object is mutated by one or more tests rather than recreated fresh per test, making each test's starting conditions depend on execution order.
4. **Ordering signal evidence** — test names use sequential numbering, step language, or lifecycle terms ("step 1", "then", "after") implying a required order that the test runner does not enforce.

#### `input-validation`
1. **Source evidence** — the value originates from an external boundary: `req.body`, `req.query`, `req.params`, `process.env`, `JSON.parse`, a file read, or a third-party API response.
2. **Usage evidence** — the unvalidated value is used directly in a sensitive operation: arithmetic, array indexing, path construction, database query, or type assertion.
3. **Missing check evidence** — no bounds check, `isNaN`, `Number.isFinite`, format check, or schema validation appears between the source and the usage.
4. **Impact evidence** — a concrete description of what goes wrong: negative offset, path traversal, NaN propagation, SQL injection surface, or invalid value persisted to storage.

#### `resource-lifetime`
1. **Acquisition evidence** — a resource is opened or acquired: `fs.open`, `pool.connect`, `createReadStream`, `setInterval`, `emitter.on`, or any operation that returns a handle requiring explicit release.
2. **Release evidence** — the corresponding release (`close`, `release`, `destroy`, `clearInterval`, `removeListener`) is absent, or is only reachable on the happy path (not in a `finally` block).
3. **Error path evidence** — a `throw`, `return`, or `await` in the same scope can exit the function before the release is reached.
4. **Impact evidence** — the leak is observable: connection pool exhaustion, open file descriptor accumulating, timer firing on a dead object, or listener accumulating across multiple instances.

#### `concurrency-and-timing`
1. **Shared state evidence** — a variable, cache, or external resource is read or written by code that may execute concurrently: module-level mutable state, a shared object across `await` calls, or a resource accessed from multiple async call paths.
2. **Async boundary evidence** — an `await`, `setTimeout`, `setInterval`, or event callback creates a gap where interleaving can occur between a read and a subsequent write of the same state.
3. **Interleaving evidence** — a concrete scenario where a second concurrent execution changes the shared state between the read and the write of the first, producing an incorrect result.
4. **Impact evidence** — the race is observable: counter drift, stale cache served, double-execution of a side effect, partial-success left unrecoverable, or unhandled promise rejection.

#### `interface-contract-violation`
1. **Contract evidence** — the API's documented signature (argument order, callback convention, return value semantics, async contract) is established: from the standard library, a popular third-party library, or visible in the diff.
2. **Violation evidence** — the call in the diff deviates: arguments are transposed, the async return value is not awaited, the callback parameters are in the wrong order, or a deprecated API is used where the replacement has different semantics.
3. **Type silence evidence** — the type checker accepts the call without error because the argument types are compatible (both `string`, both `number`), hiding the violation at compile time.
4. **Impact evidence** — the concrete incorrect behavior: operation runs backwards, rejection goes unhandled, callback receives the error as its value, or a security-relevant invariant is violated.

#### `wrong-output`
1. **Contract evidence** — the function's name, return type annotation, or documented behavior promises a specific output: a non-optional value, a typed domain error, a reliable boolean indicator, or an immutable snapshot.
2. **Violation evidence** — the implementation produces a different output on at least one reachable path: implicit `undefined`, `true` returned from a `catch`, a generic `Error` thrown where a typed error is expected, or the internal mutable reference returned directly.
3. **Path evidence** — the violating path is reachable in normal operation, not only under contrived conditions.
4. **Impact evidence** — the caller is concretely harmed: arithmetic on `NaN`, a typed error catch that never matches, a failure displayed as success, or private state mutated by an external caller.

### Overengineering

#### `boolean-flag-splitter`
1. **Branch evidence** — the boolean parameter controls an `if`/`else` whose two branches differ in return type, side effects, or core logic — not just a minor variation in output.
2. **Caller evidence** — every call site passes a literal `true` or `false` (never a variable), meaning callers have made a static decision and the flag is standing in for two distinct function names.
3. **Divergence evidence** — the two branches share little code: different I/O, different return shapes, or side effects present in one branch but absent in the other.
4. **Threading evidence** — the boolean is passed through one or more intermediate functions that do not use it directly, indicating the split is not local to a single decision point.

#### `passthrough-wrapper`
1. **Delegation evidence** — the function, method, or class body contains only a call to another function/method and returns its result without modification.
2. **Signature evidence** — the wrapper's parameters map 1:1 to the callee's parameters with no reordering, merging, splitting, defaulting, or validation.
3. **Behavior evidence** — no logging, metrics, error translation, access control, or other cross-cutting concern is added; the wrapper is invisible at runtime.
4. **Substitutability evidence** — callers could import and call the wrapped target directly without any change to their logic, types, or error handling.

### Maintainability

#### `copy-paste-variation`
1. **Structural identity evidence** — two or more blocks share the same control flow, operations, and return shape; the blocks are recognisably the same code with values swapped out.
2. **Variation evidence** — the difference between the blocks is confined to one or two values, field names, or string literals that could become parameters with no change to the surrounding logic.
3. **Locality evidence** — the duplicate blocks appear in the same function, class, or file, making the duplication visible and unambiguous rather than a coincidental resemblance across distant modules.
4. **Change-coupling evidence** — a modification to the shared logic (the accumulator, the error push, the two-step body) would need to be applied identically to every copy, with nothing to prompt the author that other copies exist.

#### `boolean-state-machine`
1. **Multiplicity evidence** — two or more boolean fields or variables whose values are coordinated: set together, checked together, or reset together in at least one place.
2. **Invalid combination evidence** — at least one combination of the boolean values represents an impossible or meaningless state (e.g., `isLoading: true` and `isLoaded: true` simultaneously), confirming the booleans are not independent.
3. **Tandem-set evidence** — the booleans are assigned in groups at two or more sites (`isLoading = false; isLoaded = true`), meaning every transition requires keeping multiple writes in sync.
4. **Discriminant evidence** — the code checks combinations of booleans to determine behavior (`if (!isLoading && !hasFailed)`) rather than reading a single named state value.

#### `deep-nesting`
1. **Depth evidence** — the function contains four or more levels of indentation from control flow constructs (`if`/`else`, `for`/`while`/`forEach`, `try`/`catch`, `switch`).
2. **Inversion evidence** — the outermost condition or one of the intermediate conditions could be inverted to an early return, collapsing one or more nesting levels with no change to behavior.
3. **Extractability evidence** — a contiguous nested block could be extracted to a named function, reducing the depth at the call site and making the extracted logic independently readable.
4. **Happy-path burial evidence** — the main success path is the deepest branch, forcing a reader to trace through all enclosing conditions before reaching the code that runs in the common case.

#### `long-parameter-list`
1. **Count evidence** — the function has five or more positional parameters.
2. **Transposition evidence** — two or more adjacent parameters share the same type, making silent argument transposition possible with no compile error.
3. **Grouping evidence** — two or more parameters belong to a single logical domain concept (e.g., `firstName`, `lastName`, `email` → user) that could be an options object.
4. **Call-site evidence** — at least one visible call site passes positional literals in sequence, making it impossible to determine which value maps to which parameter without looking up the signature.

#### `primitive-obsession`
1. **Interchangeability evidence** — two or more distinct domain concepts share the same primitive type, making it possible to pass one where the other is expected with no compile-time error (e.g., `userId: string` and `orderId: string` are interchangeable to the type system).
2. **Validation scatter evidence** — the same format check, range guard, or parsing logic for the primitive value is duplicated at multiple call sites rather than encapsulated once in a type.
3. **Semantic loss evidence** — the primitive's valid range or invariants are invisible to callers: a `number` that must be positive, a `string` that must be a valid email, an `id` that must match a specific format.
4. **Convention evidence** — nearby domain types in the same codebase use wrapper types or branded types for similar values, making the raw primitive an inconsistency.

#### `feature-envy`
1. **Access count evidence** — the function reads three or more distinct fields or methods from a single foreign object, while referencing its own class's data (`this`) zero or one times.
2. **Derivation evidence** — the function's return value or side effect is computed entirely from one foreign object's data, with no contribution from the function's own module or state.
3. **Displacement evidence** — moving the function to the foreign object would require passing fewer arguments and would remove the need to expose internal fields through a public interface.
4. **Deep navigation evidence** — the function traverses two or more levels into a foreign object's structure (`order.customer.contactInfo.email`), coupling it to implementation details the foreign object should encapsulate.

#### `mixed-abstraction-levels`
1. **Vocabulary shift evidence** — within a single function body, identifiers shift from business terms (`validateOrder`, `chargeCustomer`) to implementation terms (`Buffer`, `statusCode`, `23505`, `Content-Type`), requiring the reader to switch mental models mid-function.
2. **Extractability evidence** — a contiguous block of lines inside the function could be extracted into a well-named helper with no change to callers, and that helper's name would be more specific than the parent function's name.
3. **Granularity mismatch evidence** — some steps in the function are single named calls (`await notifyCustomer(order)`) while others are multi-line inline implementations of a comparable step, making the function uneven to read.
4. **Layer violation evidence** — a function in the business/service layer directly references persistence details (SQL, ORM internals, raw error codes) or protocol details (HTTP headers, status codes, serialization formats) that belong in a lower layer.

#### `document-intent`
1. **Opacity evidence** — a literal value, identifier, or expression requires knowledge outside the code to interpret: a bare numeric literal with domain meaning, an abbreviated string key, a bit operation, or a complex regex.
2. **Derivation cost evidence** — a reader must perform arithmetic, look up a specification, or recall an idiom to confirm the value is correct; the derivation cost is not zero.
3. **Surprise risk evidence** — the code is correct but non-obvious enough that a future maintainer would plausibly "fix" it incorrectly: a workaround, a counterintuitive ordering, or a value whose unit is invisible.
4. **Absence evidence** — no adjacent comment, no named constant, and no surrounding context explains the non-obvious element.

#### `flag-debt-explicitly`
1. **Marker evidence** — a `TODO`, `FIXME`, `HACK`, `XXX`, `@ts-ignore`, `@ts-expect-error`, `it.skip`, `xit`, or hardcoded value with an inline comment marking it as temporary is present in the diff.
2. **Missing resolution path evidence** — the marker has no ticket number, no owner, and no stated condition under which the debt can be resolved.
3. **Trackability evidence** — the debt cannot be surfaced by a project management system because it is not linked to any tracked work item.
4. **Permanence risk evidence** — without a resolution path, the debt is structurally indistinguishable from debt that is intended to remain indefinitely.

#### `remove-clutter`
1. **Unreachability evidence** — a statement, block, or declaration is provably never executed or never referenced: after an unconditional `return`/`throw`, an unused import or variable, or a branch that is structurally impossible.
2. **No-information evidence** — a comment, empty block, or duplicate declaration adds no information that the code does not already express: a comment restating the operation, an empty `else` with a placeholder comment, or a duplicate adjacent comment.
3. **Maintenance burden evidence** — the clutter is not neutral: it creates a false impression of active alternatives (commented-out code), forces readers to confirm nothing is there (empty blocks), or will drift out of sync with the code it describes (restatement comments).
4. **No suppression applies** — the clutter is not a framework requirement, an intentional no-op, a type-only import, or a tracked placeholder.

#### `long-method`
1. **Phase evidence** — the function body contains two or more distinct phases — validate, transform, persist, notify, fetch, enrich, aggregate — each of which is a named concept in the domain and a natural test boundary.
2. **Independence evidence** — the phases share little intermediate state; each phase could be extracted to a function that accepts a clear input and returns a clear output with no implicit dependency on the other phases.
3. **Length evidence** — the function is long enough that no single reader can hold its full purpose in working memory without scrolling: more than 30–40 lines as a rough guide, but phase count is the primary signal.
4. **Testability evidence** — the inline logic cannot be tested in isolation without exercising the full function; extraction would create independently testable units.

#### `data-class`
1. **Class evidence** — a `class` declaration (not an `interface`, `type`, or plain object literal) has fields and a constructor but no methods beyond trivial getters and setters.
2. **Displacement evidence** — two or more external functions each read three or more fields from the class and perform operations that would naturally live as methods of the class.
3. **Feature envy evidence** — the external functions are entirely derived from the class's data, with no contribution from their own module's state, making the class the natural home for the logic.
4. **Scatter evidence** — the displaced behavior is spread across multiple files or utilities, meaning a change to the class's fields requires finding and updating all the external functions that depend on them.

### Comprehension

#### `overly-clever-one-liner`
1. **Parsing effort evidence** — the expression requires more than one pass to understand: the reader must trace operator precedence, short-circuit evaluation, or destructuring mechanics before they can determine what the expression produces.
2. **Decomposability evidence** — the expression can be split into two or three named intermediate variables with no change to behavior, and those names would make each step's purpose self-evident.
3. **Idiom absence evidence** — the construct is not a widely-recognised JS/TS idiom (e.g., nested ternaries, comma operator, `~indexOf`, bit shifts for non-bit purposes) — a reader unfamiliar with the specific trick would be blocked.
4. **Debuggability evidence** — the expression cannot be inspected mid-computation in a debugger without rewriting it, because all intermediate values are anonymous and ephemeral.

#### `inconsistent-abstraction-in-name`
1. **Vocabulary mismatch evidence** — the name uses terms from a different layer than the surrounding context: infrastructure terms (`httpResponse`, `sqlRow`, `dbRecord`) in business logic, or business terms (`createOrder`) next to persistence terms (`deleteFromOrdersTable`) in the same module.
2. **Sibling contrast evidence** — two or more names in the same scope (module, class, or function signature) use incompatible vocabulary levels, making one name an outlier: one function is `createOrder`, the next is `executeInsertQuery`.
3. **Implementation encoding evidence** — the name encodes a mechanism or transport that callers should not need to know: `fetchUserFromDatabaseByPrimaryKey`, `sendHttpPostRequest`, `serializeToJsonAndPersist`.
4. **Expectation violation evidence** — the name implies a query (`get`, `find`, `is`, `has`) but the function has side effects, or the name implies a single concern but contains multiple sequential verbs (`getAndCache`, `loadAndValidateAndSave`).

#### `misleading-name`
1. **Contract evidence** — the name establishes an implicit promise: a `get*`/`find*`/`is*` prefix promises purity; `SCREAMING_SNAKE_CASE` promises immutability; a singular noun promises a single value; omitting a unit promises the unit is irrelevant or universally agreed.
2. **Violation evidence** — the implementation breaks the promise: the function deletes or writes, the exported constant is mutated, the function returns a collection, or the identifier's unit determines correctness and differs from what callers assume.
3. **Caller harm evidence** — a caller relying on the name's implicit contract would produce incorrect behavior: a test calling a `get*` function in a setup phase that unexpectedly deletes data, an arithmetic operation on a unitless value producing a silent magnitude error, a consumer mutating a shared `DEFAULT_*` object and corrupting other callers.
4. **Absence of documentation** — no adjacent comment, type annotation, or module-level convention explains the deviation, so the caller has no way to discover the contract violation without reading the implementation.

#### `complex-condition`
1. **Structure evidence** — the condition contains a double negative (negation applied to a name encoding a negative concept), four or more boolean terms, mixed `&&`/`||` operators without parentheses clarifying precedence, or a negated compound expression (`!(a || b)`).
2. **Resolution cost evidence** — a reader must perform a non-trivial mental transformation to evaluate the condition: cancelling two negations, applying De Morgan's law, or holding four independent terms simultaneously before the branch meaning becomes clear.
3. **Extractability evidence** — the condition could be given a name (`isEligible`, `canProceed`, `hasNoIssues`) that would reduce the call site to a single boolean read, making the extraction both feasible and meaningful.
4. **Absence of named predicate** — the compound logic is inline and unnamed; no existing function or variable captures the combined concept, meaning the reader must re-derive it at every call site.

## Finding schema

```json
{
  "skill": "pr_analysis",
  "category": "correctness",
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
| `medium` | Two evidence types present, plausible failure path, but alternative interpretations exist. | **Suppress.** Do not comment. |
| `low` | One evidence type, speculative, or the pattern is clearly defensive/intentional. | **Suppress.** Do not comment. |

## Output format

### `--format=report` (default)

For CLI use. Human-readable output — no JSON. Group findings by pass, then output:

1. **Review comments** — derived from `high` confidence findings only, using the format in [`shared/comment-format.md`](shared/comment-format.md).
2. **Summary line** — `Found N issues across M passes (P reportable after suppression).`

If no findings across all passes, output exactly: `No issues detected in the changed code.`

### `--format=annotations`

For CI pipelines and PR review comment automation. Emit a single JSON array of findings from all passes — always, even if empty. No prose, no summary line.

Example:

```json
[
  {
    "skill": "pr_analysis",
    "category": "correctness",
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
    "skill": "pr_analysis",
    "category": "correctness",
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

Suppress `low` confidence findings entirely. 