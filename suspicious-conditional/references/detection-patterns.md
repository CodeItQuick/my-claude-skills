# Detection Patterns

Patterns that frequently produce broken or meaningless conditionals. Each pattern is a *candidate*, not a finding — apply the evidence rules in `SKILL.md` and the suppression rules in `suppression-rules.md` before reporting.

## 1. Off-by-one boundary operator (`>` vs `>=`, `<` vs `<=`)

```ts
for (let i = 0; i < items.length - 1; i++) { ... }  // skips last item
if (retries > MAX_RETRIES) { ... }                    // runs one extra iteration
if (age > 18) { ... }                                 // excludes exactly-18
```

Why it matters: boundary errors are invisible at runtime until an edge-case input triggers the missing or extra iteration. Check whether sibling code, tests, or a stated invariant implies a different operator.

## 2. Self-comparison (always true or always false)

```ts
if (x === x) { ... }
if (items.length !== items.length) { ... }
```

A value compared to itself is always `true` for `===`/`==` (except `NaN`) and always `false` for `!==`/`!=`. Almost always a copy-paste error where one operand should differ.

## 3. Duplicate condition in an `if`/`else if` chain

```ts
if (status === "active") { enable(); }
else if (status === "pending") { queue(); }
else if (status === "active") { log(); }   // duplicate — dead branch
```

The repeated condition can never be reached. The branch body is either dead code or the condition was meant to be something else.

## 4. Negation of the immediately preceding condition

```ts
if (isReady) { start(); }
if (!isReady) { wait(); }   // fine — but next pattern is the bug form:

if (isReady) { start(); }
else if (!isReady) { wait(); }  // `else if (!isReady)` is always true when the else executes
```

An `else if` that negates the `if` condition is always true — it is equivalent to a plain `else`. The intent was probably a different condition.

## 5. Condition comparing a non-nullable value to `null` or `undefined`

```ts
const count = items.length;      // number, never null
if (count === null) { ... }      // dead branch
if (count !== undefined) { ... } // always true
```

When the type is non-nullable (primitive, class instance, locally constructed object), a null/undefined comparison is always the same result. Flag when the type is clearly non-nullable.

## 6. Comparing a boolean to a string literal

```ts
const isEnabled: boolean = getFlag();
if (isEnabled === "true") { ... }   // always false — boolean is never a string
if (isEnabled === true) { ... }     // fine
```

Boolean values are never string `"true"` or `"false"`. The comparison is always `false`.

## 7. Assignment inside a condition (unintended `=` instead of `==`/`===`)

```ts
if (user = getUser()) { ... }   // assigns, then tests truthiness of the result
```

This is almost always a typo for `===`. The exception is C-style intentional assignment-in-condition, which is rarely idiomatic in TS/JS and must be documented to suppress.

## 8. Bitwise operator used instead of logical operator

```ts
if (isAdmin & hasPermission) { ... }   // & is bitwise AND, not logical &&
if (isActive | isPending) { ... }      // | is bitwise OR, not logical ||
```

`&` and `|` evaluate both sides and do not short-circuit. On boolean operands they usually produce the same result, but the intent is almost always `&&` and `||`. On non-boolean operands the semantics differ.

## 9. Condition that tests a property that cannot exist on the type

```ts
type Response = { data: string; status: number };
const res: Response = await fetch();
if (res.error) { ... }    // `error` does not exist on Response — always undefined/falsy
```

Accessing an absent property is always `undefined`, making the condition always falsy. Usually a sign the wrong property name was used.

## 10. Logical operator precedence confusion

```ts
if (a || b && c) { ... }      // parsed as a || (b && c), not (a || b) && c
if (!a && b || c) { ... }     // parsed as (!a && b) || c, not !a && (b || c)
```

JavaScript's precedence rules (`&&` binds tighter than `||`) produce a different evaluation order than the author likely intended. Flag when the non-parenthesized form differs from the parenthesized form the author probably meant, supported by context.

## 11. Redundant double negation

```ts
if (!!isActive) { ... }    // equivalent to if (isActive) for booleans
if (!(!hasPermission)) { ... }
```

Double negation converts to boolean, which is a no-op when the value is already boolean. Not a correctness bug on its own — flag only when the surrounding type evidence confirms the value is already boolean and the double negation serves no purpose.

## 12. Short-circuit always resolving to one operand

```ts
const config = options || {};          // fine — `options` may be falsy
const value = true || expensiveCall(); // always `true`; right side is dead code
const result = null && process(data);  // always `null`; right side is dead code
```

When the left operand is a literal that short-circuits unconditionally, the right operand is dead code. Flag when the left operand is a literal (not a variable).

---

## Patterns to **not** flag

These look suspicious but are safe:

- `NaN !== NaN` — the only value not equal to itself; use `Number.isNaN` but the check itself is defined behavior
- Intentional assignment-in-condition with a comment: `while ((line = readline()))` documented as intentional
- `if (DEBUG) { ... }` — feature flags and compile-time constants are intentionally always-true or always-false
- `if (process.env.NODE_ENV === "test") { ... }` — environment guards, even if always the same value in one build
- Defensive `!== null` on a value that the author cannot control (external data, `JSON.parse` output, `any`-typed API responses)
- Double negation used for intentional boolean coercion of a non-boolean: `!!maybeString`