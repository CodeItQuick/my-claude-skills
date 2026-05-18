# Suppression Rules — Maintainability Passes

Pass-specific suppressions for: `copy-paste-variation`, `boolean-state-machine`, `deep-nesting`, `long-parameter-list`, `primitive-obsession`, `feature-envy`, `mixed-abstraction-levels`.

Apply [`shared/suppression-rules.md`](../shared/suppression-rules.md) first, then the relevant section below.

---

## `copy-paste-variation` suppressions

### S-CPV-1. Blocks differ in more than two axes

If abstracting requires three or more parameters to capture all the variation, the shared structure may be too thin to justify extraction. An extracted function with four parameters to represent four independent dimensions of variation is harder to read than the duplicates.

### S-CPV-2. Generated or scaffolded code

Migration files, ORM stubs, protocol buffer outputs, and code produced by a generator. The duplication is the generator's responsibility; flagging it produces a finding with no actionable fix in the diff.

### S-CPV-3. Test cases varying only in input and expected output

Parameterised test data (`it.each`, `@pytest.mark.parametrize`) is the idiomatic fix, but even unparameterised tests are conventionally allowed to repeat structure. Suppress unless the test body contains non-trivial duplicated logic beyond the arrange/assert values.

### S-CPV-4. Framework boilerplate with prescribed structure

Redux reducers, React lifecycle methods, Express middleware, and similar patterns where the duplication is dictated by the framework's calling convention. The fix would require changing the framework integration, not parameterising the code.

### S-CPV-D1. Exactly two instances where the variation is nearly the entire meaningful difference (soft — downgrade)

Two blocks where abstracting leaves only a thin shared wrapper and the extracted function would have no useful name beyond the variation itself. Downgrade and ask whether the duplication is likely to grow.

### S-CPV-A1. Three or more structurally identical blocks (do NOT suppress)

At three copies, the change-coupling risk is concrete and parameterisation is unambiguously worth the indirection. Always flag.

### S-CPV-A2. Duplicated non-trivial logic — not just field access or string substitution (do NOT suppress)

When the shared body contains a meaningful algorithm, calculation, or multi-step operation, a future bug in that logic will require finding and fixing every copy. Always flag regardless of copy count.

---

## `boolean-state-machine` suppressions

### S-BSM-1. Two fully independent booleans with all four combinations valid

`isVisible` and `isDisabled` — all four combinations are meaningful domain states with no mutual exclusion. Neither is set or checked in terms of the other. Two genuinely independent booleans are not a state machine.

### S-BSM-2. Feature flags or user preference toggles

`emailEnabled`, `smsEnabled`, `pushEnabled` — independent toggles; every combination is intentional by design. No phase relationship exists.

### S-BSM-3. Single boolean with no siblings tracking the same concern

A lone `isLoading` flag with nothing to coordinate with. The pattern requires at least two booleans that interact.

### S-BSM-4. Boolean is a cross-cutting property, not a lifecycle phase

`isReadOnly`, `isArchived`, `isDeleted` — these describe an entity's properties and are orthogonal to other state. They are not phases in a progression.

### S-BSM-D1. Two booleans with one impossible combination but simple, localised code (soft — downgrade)

Two booleans where `(true, true)` is impossible but the code is short, the two sites that set them are adjacent, and the fix would be cosmetic. Downgrade and ask whether the invalid combination is ever defended against.

### S-BSM-A1. Three or more booleans set or checked in coordination (do NOT suppress)

Three booleans produce eight combinations; the number of invalid states grows faster than the number of valid ones. Always flag.

### S-BSM-A2. Booleans reset in tandem in a dedicated reset or cleanup method (do NOT suppress)

A reset function that zeroes multiple booleans together is concrete evidence they represent collective state that a single value would express atomically.

---

## `deep-nesting` suppressions

### S-DN-1. Three or fewer levels of nesting

Below the threshold. Only flag at four or more levels created by control flow constructs.

### S-DN-2. Recursive algorithm

Recursion depth tracks problem decomposition, not control flow complexity. The techniques that flatten imperative nesting (early returns, extraction) do not apply the same way to recursive structures.

### S-DN-3. State machine — switch inside a loop

A `switch` inside a `while`/`for` is idiomatic for state machine dispatch. The nesting is structural and intentional; extracting the switch body adds indirection without clarity.

### S-DN-4. Intentional nested data transformation

Nested `map`/`filter`/`reduce` where the shape of the code mirrors the shape of the nested data structure. The nesting is declarative and the operations are pure.

### S-DN-5. Test describe/it nesting

Nested `describe` and `it` blocks in test files group related cases by convention. This is expected structure, not accidental complexity.

### S-DN-D1. Exactly four levels with a single obvious guard clause opportunity (soft — downgrade)

Downgrade to `medium` and ask specifically about inverting the outermost condition rather than asserting a full refactor is needed.

### S-DN-A1. Positive condition wrapping the entire function body (do NOT suppress)

```ts
function f(x) {
  if (x) {
    // everything is in here
  }
}
```

The guard clause inversion is mechanical and unambiguous. Always flag.

### S-DN-A2. Nested loops over different data structures (do NOT suppress)

Three nested loops each iterating a distinct collection. Extraction of the inner body to a named function is always viable and always improves readability.

---

## `long-parameter-list` suppressions

### S-LPL-1. Framework-imposed or contractual signature

Event handlers, middleware, lifecycle hooks, test framework callbacks, and interface implementations where the parameter list is dictated by a contract the author does not control. The fix would require changing the framework, not the code.

### S-LPL-2. Four or fewer parameters

Below the threshold. Only flag at five or more, and only when a transposition or grouping signal is also present.

### S-LPL-3. All parameters are distinct types with no natural grouping

`setTimeout(fn: () => void, delay: number)` — two parameters, different types, no domain concept that groups them. Distinct types prevent transposition; an options object would add ceremony with no benefit.

### S-LPL-4. Mathematical or well-known algorithmic signature

`clamp(value: number, min: number, max: number)`, `lerp(a: number, b: number, t: number)` — canonical, universal ordering. Wrapping in an options object would break familiarity across the ecosystem.

### S-LPL-5. Constructor of a configuration or options object

A class whose explicit purpose is to hold these fields. The constructor is the right place for them; extracting to a nested options object would just move the problem one level up.

### S-LPL-D1. Exactly five parameters with distinct types and no obvious grouping (soft — downgrade)

Downgrade to `medium` and ask whether a future parameter is anticipated — if not, the list may be acceptable as-is.

### S-LPL-A1. Two or more adjacent same-type parameters (do NOT suppress)

`(userId: string, orderId: string, ...)` — callers can silently transpose with no compile error. Always flag regardless of total count.

### S-LPL-A2. Boolean or flag parameters mixed into a long list (do NOT suppress)

Compound problem: a long list and unnamed boolean arguments at call sites (`fn(id, date, true, false)`). Flag and suggest moving flags into an options object.

---

## `primitive-obsession` suppressions

### S-PO-1. The primitive appears in only one place with no sibling domain concepts

A single `userId: string` with no other string-typed domain IDs in the same scope. Interchangeability requires at least two distinct concepts that could be confused.

### S-PO-2. The codebase uses primitives uniformly throughout

If no domain types are wrapped anywhere in the surrounding codebase, flagging a single primitive in isolation creates noise with no actionable precedent.

### S-PO-3. A branded or opaque type is already in use

```ts
type UserId = string & { readonly __brand: "UserId" };
```

The type system already enforces the boundary. No additional concern.

### S-PO-D1. Domain concept is local and not passed across module boundaries (soft — downgrade)

A `count: number` used within a single function. Downgrade and ask whether the invariant is simple enough to stay as a primitive.

### S-PO-A1. Two distinct domain concepts share the same primitive type in a public function signature (do NOT suppress)

`userId: string` and `orderId: string` as adjacent parameters. Callers can silently transpose them with no compile error.

### S-PO-A2. Validation logic for the same primitive duplicated at three or more call sites (do NOT suppress)

The scatter is concrete evidence the invariant should be encapsulated once.

---

## `feature-envy` suppressions

### S-FE-1. Legitimate orchestration function

A service layer, use-case handler, or command handler whose explicit job is to coordinate between multiple domain objects. Flag only when the function is dominated by one foreign object's data, not when it genuinely orchestrates several.

### S-FE-2. Mapper or serializer at a layer boundary

Functions that convert domain objects to DTOs, API payloads, or database rows are expected to read many fields. The conversion is the job; field access is expected.

### S-FE-3. Framework-constrained function

Controllers, resolvers, and event handlers must accept the types the framework provides. The envy may be real but restructuring is not always possible.

### S-FE-4. Short accessor — fewer than three field accesses on a single foreign object

One or two field accesses do not constitute envy. Three or more on the same object, with no `this` reference, is the threshold.

### S-FE-D1. Function belongs elsewhere but moving it is a large refactor (soft — downgrade)

The displacement is real but the fix spans multiple files. Downgrade to `medium` and ask as a design question rather than a blocking comment.

### S-FE-A1. Three or more distinct fields read from one foreign object while `this` is not referenced (do NOT suppress)

Core evidence. Flag.

### S-FE-A2. Function traverses two or more levels into a foreign object's structure (do NOT suppress)

`order.customer.contactInfo.email` — deep navigation couples the function to internal implementation details.

---

## `mixed-abstraction-levels` suppressions

### S-MAL-1. Framework-imposed bridging

Express handlers, GraphQL resolvers, and CLI commands are designed to bridge levels. A handler that reads `req.body`, calls a service, and sets `res.status` is following the framework pattern.

### S-MAL-2. Small function where the level difference is negligible

A 5-line function that calls one high-level method and does one low-level check. The cognitive cost of the mix is negligible.

### S-MAL-3. Intentional low-level module

A module explicitly responsible for serialization, encoding, or protocol handling. Mixed levels is a concern only when a higher-level module unexpectedly drops to this level.

### S-MAL-4. Single audit log line at a domain event

`logger.info("Order completed", { orderId })` at the end of a business function is an audit trail, not a level violation.

### S-MAL-D1. Inline block that is simple and called only once (soft — downgrade)

A contiguous block that could extract to a named helper but would only be called from one place and the logic is short. Downgrade and ask whether the readability benefit of extraction is worth the added indirection.

### S-MAL-A1. Raw SQL, HTTP details, or database error codes inside a service-layer function (do NOT suppress)

Strong signal of a layer violation. Flag.

### S-MAL-A2. Infrastructure setup inside a function that is supposed to execute work (do NOT suppress)

Creating loggers, connection pools, or queues inside a function that should orchestrate business logic. The setup belongs at the composition root or module boundary.