# Suppression Rules — Overengineering Passes

Pass-specific suppressions for: `boolean-flag-splitter`, `passthrough-wrapper`, `speculative-generality`, `unnecessary-code-growth`.

Apply [`shared/suppression-rules.md`](../shared/suppression-rules.md) first, then the relevant section below.

---

## `boolean-flag-splitter` suppressions

### S-BFS-1. The flag selects a minor output variation with shared core logic

```ts
function formatDate(date: Date, includeTime: boolean): string {
  const base = date.toLocaleDateString();
  return includeTime ? `${base} ${date.toLocaleTimeString()}` : base;
}
```

Both branches share the same core logic; the flag appends an optional suffix. The split is cosmetic, not fundamental.

### S-BFS-2. The flag is passed as a runtime variable, not a literal

```ts
const detailed = config.verboseMode;
renderReport(data, detailed);
```

When callers pass a variable rather than a literal, the flag is a genuine runtime toggle, not a static decision in disguise.

### S-BFS-3. The function is a well-known idiom

`stringify(value, pretty: boolean)`, `serialize(data, compact: boolean)` — canonical patterns recognized across the ecosystem. Splitting these would break familiarity.

### S-BFS-D1. Branches share significant setup but diverge at the end (soft — downgrade)

Two branches that share 70%+ of their code and diverge only in the final step. Downgrade to `medium` and ask whether the variation warrants a second function or is small enough to stay.

### S-BFS-A1. Two branches have different I/O or fundamentally different control flow (do NOT suppress)

One branch reads from a file, the other from HTTP. Or one branch returns early, the other iterates. The operations are different in kind, not just in degree.

### S-BFS-A2. Flag is threaded through intermediate functions that don't use it directly (do NOT suppress)

Threading through two or more layers without direct use is a strong signal that two separate call chains should exist.

---

## `passthrough-wrapper` suppressions

### S-PW-1. The wrapper adapts the calling convention

Parameter reordering, partial application, default argument injection, name adaptation for a different interface, or narrowing a union type to a specific member. The wrapper is doing translation work.

### S-PW-2. The wrapper exists to enable dependency injection or testability

```ts
class Notifier {
  constructor(private mailer: Mailer) {}
  send(to: string, body: string) { return this.mailer.send(to, body); }
}
```

The wrapper makes `Notifier` mockable independently of `Mailer`. The indirection is the point.

### S-PW-3. The wrapper enforces an interface or base class contract

A method that implements an interface by delegating to an injected collaborator. The delegation satisfies the contract; there is no redundancy.

### S-PW-4. The wrapper adds any cross-cutting concern

Logging, metrics, retry, caching, error translation, access control — even if small — mean the wrapper is not a pure passthrough.

### S-PW-D1. Wrapper has an aspirational name suggesting planned behavior (soft — downgrade)

`processPayment` currently only calls `gateway.charge()` but the name implies future expansion. Downgrade and ask whether planned behavior is imminent or speculative.

### S-PW-A1. Parameters map 1:1 and callers could import the target directly (do NOT suppress)

No reordering, defaulting, or narrowing. Flag as `Suggested:` — the author may have a reason, so ask rather than assert.

---

## `speculative-generality` suppressions

### S-SG-1. Interface or abstract class used in tests as a mock or test double

Testability is a concrete present use. If the interface is injected and swapped in test files with a fake or mock implementation, the abstraction has a real consumer. Do not flag.

### S-SG-2. A second implementation is present in the same diff

Even if only one implementation exists before the diff, adding a second in the same change justifies the abstraction. The generality is being used immediately.

### S-SG-3. Library or framework extension point for external consumers

A base class, interface, or hook designed for consumers outside the codebase (a published npm package, a plugin API, a framework that users extend). The visible codebase cannot enumerate its consumers.

### S-SG-4. Public API surface of an exported package

An exported generic function or interface may be used by callers in other packages. "Zero local callers" does not mean "no consumers."

### S-SG-5. Generic with a meaningful constraint that carries behavior

`function max<T extends Comparable>(a: T, b: T)` uses the constraint to express a real requirement and enables the function to call `compareTo` on `T`. The type parameter is not purely speculative.

### S-SG-D1. Single-subclass abstract class with a comment referencing a planned second subclass (soft — downgrade)

If the comment references a tracked ticket and the work is imminent, downgrade and ask whether the abstraction is needed now or can be added when the second subclass is written.

### S-SG-A1. Generic type parameter that is always bound to the same concrete type across all call sites (do NOT suppress)

No polymorphism is being used. The generic mechanism adds complexity at the definition and in error messages for no benefit.

### S-SG-A2. Hook, event, or plugin slot with zero registered consumers in the entire codebase (do NOT suppress)

Extension infrastructure with no extensions is speculative API surface. Always flag.

---

## `unnecessary-code-growth` suppressions

### S-UCG-1. Defensive guard against programmer error at a public API boundary

`if (!array) throw` at the entry to an exported function is correct even if the type says non-nullable — JavaScript callers may not use TypeScript. Guards at public boundaries are not unnecessary growth.

### S-UCG-2. Branch required by a protocol, standard, or specification

An HTTP `501 Not Implemented` default, a codec's reserved-byte handler, a state machine's `UNKNOWN` transition. The branch complies with a specification, not current caller needs.

### S-UCG-3. Feature flag or environment variable branch with a tracked enablement condition

A `process.env.FEATURE_X` branch that is currently inactive but has a ticket and a stated condition for enablement. The growth is intentional and tracked.

### S-UCG-4. Exported from a library or shared package

A zero-internal-caller export may have consumers in other packages. Do not flag exported symbols as unnecessary growth without evidence they are truly unused across all consumers.

### S-UCG-5. Option property documented as reserved or versioned

An options field explicitly documented as `reserved` or `@future` that is part of a versioned API contract. Its presence is intentional and externally visible.

### S-UCG-D1. Branch for a case that is typed as impossible but the type assertion could be removed (soft — downgrade)

A branch reachable only via `as any` or an unsafe cast. Downgrade and ask whether the cast site should be the fix rather than the branch.

### S-UCG-A1. Branch for a variant the type system makes structurally unreachable (do NOT suppress)

`order.currency` typed as `"USD" | "EUR"` with a branch for `"GBP"` that TypeScript would flag as unreachable. Always flag — the type and the branch are out of sync.

### S-UCG-A2. Options property always set to the same value across all visible call sites (do NOT suppress)

The configurability is unused. Always flag and ask whether the property should be removed or have its default promoted to the implementation.