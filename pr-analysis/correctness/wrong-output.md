# Detection Patterns — Wrong Output

Patterns where the return value or thrown exception does not match what callers expect based on the function's name, signature, or documented contract. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the wrong-output suppression rules in `../shared/suppression-rules.md` before reporting.

This pass is distinct from `swallowed-exceptions`, which covers caught exceptions that are not propagated. This pass covers output that is propagated but wrong: a `true` when the operation failed, a generic `Error` when the contract promises a typed domain error, or `undefined` slipping out of a non-optional return type.

## 1. Implicit `undefined` returned on one branch of a non-optional return type

```ts
function findDiscountRate(code: string): number {
  const promo = promotions.get(code);
  if (promo) {
    return promo.rate;
  }
  // falls off the end — returns undefined implicitly
}
```

The return type is `number`, but when `promo` is falsy the function returns `undefined`. If TypeScript's `strictNullChecks` is off or the return type was written by hand, the caller receives `undefined` where it expected a `number`. Arithmetic on the result (`total * findDiscountRate(code)`) produces `NaN` silently.

## 2. Success value returned from a `catch` block masking a failure

```ts
async function saveUser(user: User): Promise<boolean> {
  try {
    await db.users.upsert(user);
    return true;
  } catch (err) {
    logger.error(err);
    return true;    // ← should be false or re-throw
  }
}
```

The `catch` block logs the error but returns `true`, the same value as success. Callers that branch on the return value (`if (!await saveUser(user)) showError()`) will never show the error. The function's signature promises a reliable `boolean` indicator, but it always reports success.

## 3. Wrong exception type thrown — too generic for the contract

```ts
class UserRepository {
  async findById(id: string): Promise<User> {
    const user = await db.users.findById(id);
    if (!user) {
      throw new Error(`User ${id} not found`);   // callers expect UserNotFoundError
    }
    return user;
  }
}

// elsewhere:
try {
  const user = await repo.findById(id);
} catch (e) {
  if (e instanceof UserNotFoundError) handleMissing();   // never matched
  else throw e;
}
```

The caller catches `UserNotFoundError` specifically. The repository throws `Error` instead. The `instanceof` check always fails, the `else throw e` re-throws every not-found as an unhandled error, and `handleMissing()` is never called.

## 4. Mutable reference returned when callers expect an immutable snapshot

```ts
class Config {
  private settings: Record<string, string> = {};

  getSettings(): Record<string, string> {
    return this.settings;    // returns the live internal object
  }
}

const config = new Config();
const s = config.getSettings();
s["debug"] = "true";        // mutates Config's internal state
```

The method name `getSettings` implies a query. Returning the internal reference allows callers to mutate `Config`'s private state without going through any setter or validation logic. A copy (`{ ...this.settings }`) or a `Readonly<>` wrapper would enforce the intended read-only contract.

## 5. Accumulated errors lost — function returns on first success, ignoring failures

```ts
async function syncAll(items: Item[]): Promise<SyncResult> {
  for (const item of items) {
    const result = await syncOne(item);
    if (result.ok) return { success: true };   // returns on first success
  }
  return { success: false };
}
```

The intent is likely "return success if any item syncs" or "return success if all items sync". But as written, the function returns immediately on the first success without processing remaining items. All items after the first success are never synced, and their failures are invisible in the result.

## 6. Async function returns a resolved value before an async operation completes

```ts
async function publish(event: Event): Promise<void> {
  queue.publish(event);       // async, not awaited
  return;                     // returns before publish completes
}
```

The caller `await`s `publish(event)` expecting the event to be in the queue when the promise resolves. But the inner `queue.publish` is not awaited, so the function resolves immediately. If the queue operation fails, the error is unhandled and the caller has no indication. This is distinct from the `interface-contract-violation` unawaited-promise pattern because the function's own return value is wrong, not just the internal call.

---

## Evidence required

Gather **at least two** before reporting:

1. **Contract evidence** — the function's name, return type annotation, or documented behavior promises a specific output: a non-optional value, a typed domain error, a reliable boolean indicator, or an immutable snapshot.
2. **Violation evidence** — the implementation produces a different output on at least one reachable path: implicit `undefined`, `true` returned from a `catch`, a generic `Error` thrown where a typed error is expected, or the internal mutable reference returned directly.
3. **Path evidence** — the violating path is reachable in normal operation, not only under contrived conditions.
4. **Impact evidence** — the caller is concretely harmed: arithmetic on `NaN`, a typed error catch that never matches, a failure displayed as success, or private state mutated by an external caller.

---

## Patterns to **not** flag

- **Explicit sentinel return documented in the signature** — `findUser(): User | null` returning `null` is the contract, not a bug.
- **Typed `Result`/`Either` error returns** — a function that returns `Result<T, E>` with an `Err` variant on failure is using an explicit error channel.
- **Re-throwing the same exception** — `catch (e) { throw e; }` preserves the original type and is correct.
- **Generic `Error` in utility code** — low-level utilities with no domain concept may reasonably throw `Error`. Only flag when the call site demonstrates it expects a more specific type.
- **Early return of `undefined` in a `void` function** — `return;` in a `void` function is a control flow statement, not a missing return value.

---

## Comment examples

**Good:**

> **Blocking:** `findDiscountRate` at line 18 falls off the end when `promotions.get(code)` returns `undefined`, implicitly returning `undefined`. The return type is `number`, and callers multiply the result with `total` — producing `NaN` silently. Could we add an explicit `return 0` or throw `new UnknownPromoCodeError(code)`?

> **Suggested:** `saveUser` at line 44 returns `true` in both the `try` and `catch` branches. Callers that branch on the return value (`if (!await saveUser(user)) showError()`) never see a failure. Should the `catch` branch return `false` or re-throw?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Implicit `undefined` returned on a branch typed as non-optional | Assert: "`findDiscountRate` returns `undefined` when no promo matches — the return type `number` doesn't permit this." |
| `return true` / `return { success: true }` inside `catch` | Assert: "The `catch` branch returns `true` — callers cannot distinguish success from failure." |
| Generic `Error` thrown where typed error expected | Ask: "Does the caller catch `UserNotFoundError` specifically? If so, throwing `Error` means that catch block is never reached." |
| Internal reference returned from a getter | Ask: "Does `getSettings()` need to return a copy? Returning the internal object lets callers mutate `Config`'s private state." |