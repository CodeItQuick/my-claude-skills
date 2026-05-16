# Suppression Rules

A noisy reviewer is worse than a quiet one. **When in doubt, suppress.** This file lists the cases where a candidate looks like a broken conditional but should not be reported.

## Hard suppressions (always)

Suppress without further analysis when any of these are true:

### S1. The condition is a compile-time or environment constant

```ts
if (process.env.NODE_ENV === "production") { ... }
if (DEBUG) { ... }
if (__DEV__) { ... }
```

These are intentionally always-true or always-false in a given build. The "dead branch" is the point — it is tree-shaken in the other build.

### S2. The condition is a feature flag or kill switch

```ts
if (FEATURE_NEW_CHECKOUT) { ... }
if (flags.isEnabled("dark-mode")) { ... }
```

Feature flags are designed to be toggled. The current value may appear constant, but the branch is live by design.

### S3. `NaN` self-comparison used as an `isNaN` check

```ts
if (value !== value) { ... }   // standard NaN check pre-ES6
```

This is the canonical non-`Number.isNaN` idiom. Flag only if the code is clearly not intending a NaN check — e.g., `if (items.length !== items.length)`.

### S4. Intentional assignment-in-condition with documentation

```ts
while ((chunk = stream.read()) !== null) { ... }
// or with a comment: /* intentional assignment */
if ((match = regex.exec(str)) !== null) { ... }
```

Assignment-in-condition is idiomatic in streaming/parsing loops. Suppress when the pattern is a known idiom or there is a comment signaling intent.

### S5. Double negation used for boolean coercion of a non-boolean

```ts
const isVisible = !!element.offsetParent;  // coerce to boolean
const hasItems = !!list.length;
```

`!!` on a non-boolean value is intentional coercion. Only flag `!!` when the operand's type is already `boolean`.

### S6. Defensive null check on `any`-typed or externally-sourced data

```ts
const parsed = JSON.parse(raw) as Config;
if (parsed.field !== null) { ... }   // `any`/cast — runtime value is unknown
```

When the value comes from `JSON.parse`, an untyped API response, or is cast with `as`, the TypeScript type is not authoritative. The null check may be legitimately defensive.

### S7. The condition is in unchanged code

If the conditional is not part of the diff, do not report it. This skill reviews *what changed*. Pre-existing issues are out of scope unless the user explicitly asks.

### S8. Explicit guard against a known JS quirk

```ts
if (typeof value === "undefined") { ... }   // typeof-guard pattern
if (value == null) { ... }                  // catches both null and undefined intentionally
```

`typeof x === "undefined"` and `x == null` (loose equality) are established JS idioms for guarding against both `null` and `undefined`. Do not flag as a comparison-to-null bug.

## Soft suppressions (downgrade confidence)

Don't suppress entirely, but drop confidence by one level:

### D1. Off-by-one where the boundary value is not reached in practice

If the code has a test, assertion, or comment establishing that the boundary value is never produced, downgrade from `high` to `medium`. The logic may still be fragile, but it is not demonstrably broken given the current invariants.

### D2. Condition that looks redundant but guards against future callers

```ts
// This function is currently only called with verified inputs, but the guard
// is here for safety.
if (count < 0) return;
```

If there is an adjacent comment explaining the forward-looking intent, downgrade rather than suppress. Phrase the finding as a question: "Is this guard needed today, or could it be replaced with an assertion?"

### D3. Operator-precedence issue where the result is the same for all current inputs

If you can verify that `a || b && c` and `(a || b) && c` produce identical results for all values that can flow to this expression given the surrounding types, downgrade to `medium`. The code is still misleading but not immediately broken.

## Anti-suppressions (do NOT suppress)

These look intentional but aren't:

### A1. `else if` that is the logical negation of the `if`

```ts
if (isReady) { ... }
else if (!isReady) { ... }  // NOT a stylistic choice — always true in the else branch
```

An `else if` that negates the `if` condition is always true. This is never intentional — suppress only if it is literally an `else` block (without the redundant condition).

### A2. Duplicate condition with a different body

```ts
if (status === "active") { enable(); }
else if (status === "active") { log(); }   // different body — clearly unintended
```

The author intended the second branch to test something else. The different body is evidence that this is a copy-paste bug, not intentional duplication.

### A3. Bitwise operator on boolean operands without a comment

```ts
if (isAdmin & hasPermission) { ... }
```

The only reason to use `&` on booleans is to prevent short-circuit evaluation. This is an extremely rare requirement and must be documented to suppress. Without a comment, flag it.

### A4. Self-comparison that is not on a floating-point value

```ts
if (items.length !== items.length) { ... }  // `length` is never NaN
if (userId === userId) { ... }              // string is never NaN
```

The NaN-check idiom only applies to values that can actually be `NaN`. For integers, strings, and objects, self-comparison is always the same result and is a bug.