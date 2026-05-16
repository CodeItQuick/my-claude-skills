# Suppression Rules

A noisy reviewer is worse than a quiet one. **When in doubt, suppress.** Apply shared suppressions first, then the pass-specific rules for the active pass.

---

## Shared suppressions (apply to all passes)

### S-ALL-1. The candidate is in unchanged code

If the line in question is not part of the diff, do not report it. This skill reviews *what changed*. Pre-existing issues are out of scope unless the user explicitly asks.

### S-ALL-2. Test code intentionally exercising a failure path

```ts
it("throws when user is missing", () => { ... });
await expect(fn()).rejects.toThrow();
expect(() => user.name).toThrow();
```

Tests that deliberately trigger failure are not bugs — they are assertions on failure behavior.

### S-ALL-3. The pattern is documented as intentional

An adjacent comment that states *why* the code is safe or intentional — not merely "intentional" — is sufficient to suppress. The comment must give the reason, not just assert intent.

---

## `null-access` suppressions

### S-NA-1. Optional chaining is used

```ts
return user?.profile?.name;
```

`?.` already handles the missing case.

### S-NA-2. Nullish coalescing supplies a default

```ts
return (user ?? defaultUser).name;
const name = user?.name ?? "Anonymous";
```

### S-NA-3. Inline guard on the same expression

```ts
return user && user.name;
return user ? user.name : null;
```

### S-NA-4. Earlier guard returns, throws, or continues

```ts
const user = users.find(u => u.id === id);
if (!user) throw new NotFound();
return user.name;   // safe
```

Also covered: `return null`, `continue`, `assertExists(user)`, `invariant(user, "...")`, `assert(user)`.

### S-NA-5. Value provably non-nullable

Locally constructed value with a non-nullable type, or a function with a non-nullable return type.

### S-NA-6. Type-checker would already error

If TypeScript with `strictNullChecks` would flag this, do not duplicate the type checker's job. Only report when the type system is being silenced (`!`, `as`, `any`) or is not in use.

### S-NA-D1. Non-null assertion with adjacent explanatory comment (soft — downgrade)

```ts
// Safe: caller guarantees user exists in this code path
const user = users.find(u => u.id === id)!;
```

Downgrade `high` to `medium`. If the comment is missing, do not downgrade.

### S-NA-D2. Contract-style parameter name (soft — downgrade)

```ts
function greet(requiredUser: User | undefined) { return requiredUser.name; }
```

Downgrade and phrase as a question about whether the parameter type should be tightened.

### S-NA-D3. Private helper whose one visible caller already guards (soft — downgrade)

If the caller is visible in the diff and guards before the call, downgrade. If the caller is not visible, do not downgrade.

### S-NA-A1. Guard on a *different* property (do NOT suppress)

```ts
if (user.id) { return user.profile.name; }  // guards id, not profile
```

### S-NA-A2. Guard inside a callback that runs later (do NOT suppress)

```ts
setTimeout(() => { if (!user) return; }, 100);
return user.name;  // synchronous, guard runs after
```

### S-NA-A3. Boolean coercion of a falsy-but-defined value (do NOT suppress)

```ts
if (user.count) { return data[user.count].name; }  // count may be 0
```

### S-NA-A4. Type assertion that lies (do NOT suppress)

```ts
const user = users.find(u => u.id === id) as User;
```

`as` is not a runtime check. Treat the same as a non-null assertion without a comment.

---

## `swallowed-exceptions` suppressions

### S-SE-1. The error is re-thrown or propagated

Any `throw` in the catch body — direct re-throw or `throw new Err("msg", { cause: e })` — means the error is not swallowed.

### S-SE-2. The error is passed to a continuation

```ts
callback(err); reject(err); next(err); observer.error(err);
```

Handed off to a downstream handler; the catch is a translation layer.

### S-SE-3. Best-effort / cleanup code with no caller dependency

```ts
async function closeConnection() {
  try { await conn.close(); } catch { /* may already be closed */ }
}
```

When the operation is a finalizer and callers do not check its return value, suppress.

### S-SE-4. Catch calls a clearly-named error-handling function

`handleError(err)`, `reportToSentry(err)`, `logError(err)`, `captureException(err)`, `trackError(err)`. Ambiguous names like `process(err)` do not qualify.

### S-SE-5. Error is recorded in observable state

```ts
this.error = err; this.status = "failed";
```

The exception is converted to a signal the caller can read — not swallowed.

### S-SE-D1. Log-only at `warn` or `error` level (soft — suppress)

`logger.error(...)` / `logger.warn(...)` makes the failure visible in observability tooling. Suppress. A bare `console.log` does not qualify.

### S-SE-D2. Returns a typed sentinel the caller visibly checks (soft — suppress)

If the caller is visible in the diff and checks the sentinel value, suppress.

### S-SE-D3. Retry wrapper that re-throws on the final attempt (soft — suppress)

```ts
for (let i = 0; i < 3; i++) {
  try { return await op(); }
  catch (e) { if (i === 2) throw e; await sleep(delay); }
}
```

### S-SE-A1. Log-only at `console.log` or `logger.debug` (do NOT suppress)

Not error handling. Still flag.

### S-SE-A2. Conditional re-throw (do NOT suppress)

```ts
if (shouldRethrow) throw err;
```

May silently swallow. Still flag.

### S-SE-A3. Error assigned to an unused local (do NOT suppress)

```ts
const ignored = err;
```

Not handling. Still flag.

### S-SE-A4. Re-thrown without cause chain (do NOT suppress)

```ts
throw new Error("Something went wrong");  // `e` not included
```

Flag at `medium` with a suggested fix to add `{ cause: e }`.

---

## `suspicious-conditional` suppressions

### S-SC-1. Compile-time or environment constant

```ts
if (process.env.NODE_ENV === "production") { ... }
if (DEBUG) { ... }
if (__DEV__) { ... }
```

Intentionally always-true or always-false per build; the "dead branch" is tree-shaken.

### S-SC-2. Feature flag or kill switch

```ts
if (FEATURE_NEW_CHECKOUT) { ... }
if (flags.isEnabled("dark-mode")) { ... }
```

Designed to be toggled; the branch is live by intent.

### S-SC-3. `NaN` self-comparison as an `isNaN` check

```ts
if (value !== value) { ... }
```

Canonical pre-ES6 idiom. Only flag when the operand cannot be `NaN` (e.g., `items.length`).

### S-SC-4. Intentional assignment-in-condition with documentation

```ts
while ((chunk = stream.read()) !== null) { ... }
```

Idiomatic in streaming/parsing loops. Suppress when it is a known idiom or a comment signals intent.

### S-SC-5. Double negation for boolean coercion of a non-boolean

```ts
const isVisible = !!element.offsetParent;
```

`!!` on a non-boolean is intentional coercion. Only flag `!!` when the operand is already `boolean`.

### S-SC-6. Defensive null check on `any`-typed or externally-sourced data

```ts
const parsed = JSON.parse(raw) as Config;
if (parsed.field !== null) { ... }
```

TypeScript type is not authoritative here; the check may be legitimately defensive.

### S-SC-7. Established JS idiom guards

```ts
if (typeof value === "undefined") { ... }
if (value == null) { ... }   // intentional loose equality
```

Do not flag as broken null comparison.

### S-SC-D1. Off-by-one where boundary is established by tests or assertions (soft — downgrade)

Downgrade from `high` to `medium`; phrase as a question.

### S-SC-D2. Redundant guard with a forward-looking comment (soft — downgrade)

```ts
// Guard here for future callers
if (count < 0) return;
```

Downgrade and ask: "Is this guard needed today, or could it be an assertion?"

### S-SC-D3. Precedence issue where result is identical for all current inputs (soft — downgrade)

If `a || b && c` and `(a || b) && c` produce the same result for all reachable values, downgrade to `medium`. Code is misleading but not immediately broken.

### S-SC-A1. `else if` that negates the `if` (do NOT suppress)

```ts
if (isReady) { ... } else if (!isReady) { ... }
```

Always true in the else branch; never intentional.

### S-SC-A2. Duplicate condition with a different body (do NOT suppress)

```ts
if (status === "active") { enable(); }
else if (status === "active") { log(); }
```

Different bodies confirm copy-paste intent; still flag.

### S-SC-A3. Bitwise operator on boolean operands without a comment (do NOT suppress)

```ts
if (isAdmin & hasPermission) { ... }
```

Extremely rare intentional use must be documented. Without a comment, flag.

### S-SC-A4. Self-comparison on a non-float value (do NOT suppress)

```ts
if (items.length !== items.length) { ... }
if (userId === userId) { ... }
```

The NaN-check idiom applies only to values that can actually be `NaN`.