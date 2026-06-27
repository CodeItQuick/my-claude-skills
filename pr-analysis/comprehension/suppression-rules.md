# Suppression Rules — Comprehension Passes

Pass-specific suppressions for: `overly-clever-one-liner`, `inconsistent-abstraction-in-name`, `misleading-name`, `complex-condition`.

Apply [`shared/suppression-rules.md`](../shared/suppression-rules.md) first, then the relevant section below.

---

## `overly-clever-one-liner` suppressions

### S-OCL-1. Established single-expression idiom

`arr.includes(x)`, `x ?? default`, `obj?.prop`, `Math.min(a, b)`, `(n & 1) === 0`, `!!value`, `+string`. Readable because universally recognized.

### S-OCL-2. Short ternary for a two-way choice with no nesting

`const label = isActive ? "Active" : "Inactive"` — one condition, two short branches, immediately legible.

### S-OCL-3. Two or three chained array methods where the data shape is obvious

`users.filter(u => u.active).map(u => u.email)` — the shape does not require tracing.

### S-OCL-4. Performance-critical code with an adjacent explaining comment

A bit trick in a tight loop with a comment explaining why the idiom was chosen. The tradeoff is documented.

### S-OCL-D1. Three-deep chain where an intermediate name would help (soft — downgrade)

Three methods chained where the middle result's shape is non-obvious. Downgrade and suggest naming the intermediate.

### S-OCL-A1. Nested ternaries — two or more levels (do NOT suppress)

Always flag. The saving is one line; the cost is every future reader.

### S-OCL-A2. `~indexOf` or bit shift for a non-bit purpose (do NOT suppress)

Not universally recognized idioms. Flag and suggest the readable equivalent.

### S-OCL-A3. Side effect hidden inside `&&` or `||` short-circuit (do NOT suppress)

Mutations, assignments, and function calls with side effects hidden in a logical expression are always worth flagging.

---

## `inconsistent-abstraction-in-name` suppressions

### S-IAN-1. Single isolated name with no siblings to contrast against

A naming inconsistency needs at least one sibling name in the same scope to confirm the pattern. A lone outlier is weak evidence — suppress unless the name itself encodes a mechanism in a clearly business-level context.

### S-IAN-2. Framework-imposed naming

Controllers, resolvers, CLI handlers, and middleware often use technical names because the framework requires it (`handleRequest`, `resolveQuery`).

### S-IAN-3. Accepted domain shorthands

`req`, `res`, `ctx`, `dto`, `db`, `repo`, `tx` — conventional abbreviations used consistently across the codebase. Not abstraction violations.

### S-IAN-4. Established ORM or persistence idioms

`getOrCreate`, `findOrCreate`, `upsert` — well-known patterns whose compound verb is conventional, not surprising.

### S-IAN-D1. Single function with a mechanism-encoding name but no siblings to confirm the pattern (soft — downgrade)

Downgrade and ask whether the name could be simplified to hide the mechanism, without asserting there is a pattern.

### S-IAN-A1. Two or more sibling functions in the same module mixing domain and persistence vocabulary (do NOT suppress)

Multiple instances confirm a systemic naming inconsistency.

### S-IAN-A2. Function named as a query (`get`, `find`, `is`, `has`) that has documented or visible side effects (do NOT suppress)

The name creates a false expectation of purity that callers will act on.

---

## `misleading-name` suppressions

### S-MN-1. Module-wide convention documented in README or config

If the module states all durations are milliseconds or all sizes are bytes, omitting the unit suffix from identifiers is a consistent style choice, not a misleading name.

### S-MN-2. Framework-prescribed name

`handleRequest`, `resolveQuery`, `beforeEach`, `teardown` — the framework defines the contract and the name follows it. Side effects are part of the expected lifecycle.

### S-MN-3. Established compound idiom

`getOrCreate`, `findOrCreate`, `upsert` — the mutation is signaled by the compound verb and is widely understood in its domain. Not misleading.

### S-MN-4. Name where the side effect is the primary purpose at the correct abstraction level

`saveUser` in a module named `user-persistence`, `sendEmail` in a notification service — the name matches the abstraction level and the side effect is the contract. Flag only when behavior exceeds what the name implies, not when the name accurately encodes the behavior.

### S-MN-5. Negated name that is the natural domain term

`isDisabled`, `isHidden`, `isSuspended`, `isBlocked` where the negative state is the primary domain concept. Flag only when the value assigned contradicts the name (assigning `true` to `isDisabled` to mean enabled) — not when the domain term is naturally negative.

### S-MN-A1. Query-named function with a visible mutation or deletion in the body (do NOT suppress)

`get*`, `find*`, `fetch*`, `load*`, `is*`, `has*` functions that `delete`, `insert`, `update`, or mutate external state. The caller cannot know from the name that a call is destructive.

### S-MN-A2. Unit-sensitive identifier where a mismatch would produce a silent correctness bug (do NOT suppress)

When passing the value to a function that requires a specific unit (e.g., `setTimeout(cb, timeout)` where `timeout` could be seconds), the omitted unit is a correctness hazard, not a style issue.

---

## `complex-condition` suppressions

### S-CC-1. Two-term condition

`if (a && b)` or `if (a || b)` — always readable regardless of operators. Only flag conditions with three or more terms where the cognitive load is demonstrably elevated.

### S-CC-2. Named predicate at the call site

`if (isEligible(order))` is already extracted. Do not flag the call site; flag only the predicate body if it is itself complex.

### S-CC-3. Single negation of an unambiguous positive name

`!isActive`, `!isEnabled`, `!isValid` — one negation on a clearly positive name. The reader resolves it in one step; this is not a double negative.

### S-CC-4. Short-circuit null guard

`user && user.isAdmin`, `items?.length > 0` — idiomatic nullable-access patterns. Not a compound condition for the purposes of this pass.

### S-CC-5. Test assertion

`expect(!user.isActive && !user.isVerified).toBe(true)` — test assertions are verbose to communicate exactly what is being verified. Complexity in assertion conditions is expected.

### S-CC-6. Generated or policy-driven condition

Permission engines, access-control policies, and generated authorization code may produce multi-clause conditions by construction. No actionable fix exists in the diff.

### S-CC-D1. Three-term mixed-polarity condition (soft — downgrade)

Three terms where two are positive and one is negative (or vice versa). Downgrade and ask whether a named predicate would be clearer, rather than asserting it is required.

### S-CC-A1. Four or more terms in a single condition (do NOT suppress)

At four terms the reader must hold all simultaneously. Always flag and suggest extraction to a named predicate.

### S-CC-A2. Negation of a compound `&&`/`||` expression without explicit parentheses (do NOT suppress)

`!(a || b)` without parentheses making the grouping explicit, or a mixed `&&`/`||` condition where operator precedence is required to evaluate correctly. Always flag.