# Detection Patterns — Swallowed Exceptions

Patterns that frequently introduce swallowed exceptions. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the swallowed-exception suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. Empty catch block

```ts
try {
  await writeFile(path, data);
} catch (e) {}
```

The operation failed, the caller has no idea, and execution continues with potentially corrupt state.

## 2. Catch block that only logs (no re-throw)

```ts
try {
  await saveRecord(record);
} catch (err) {
  console.log("Error:", err);  // logged but not re-thrown
}
// caller proceeds as if save succeeded
```

Logging alone does not constitute handling. The caller cannot react to the failure. Upgrade severity when the call site does not check any sentinel return value.

## 3. Promise `.catch()` that discards the error

```ts
fetchUser(id).catch(() => {});
fetchUser(id).catch(err => null);
fetchUser(id).catch(err => undefined);
```

The promise chain is silently resolved to `undefined`/`null`, hiding the failure from any `.then()` consumer downstream.

## 4. Catch that returns a silent default

```ts
try {
  return JSON.parse(raw);
} catch {
  return {};      // caller gets an empty object, never learns parse failed
}
```

Returning a typed default hides the failure. Flag when the caller cannot distinguish a genuine empty result from a parse failure.

## 5. Exception binding named `_` or ignored with no comment

```ts
try {
  await connect();
} catch (_) {
  // no action
}
```

Naming the binding `_` signals intentional discard, but without a comment explaining why proceeding is safe, it is a candidate. See `S-SE-3` in suppression-rules for when a comment saves it.

## 6. Catch that re-throws a less informative error

```ts
try {
  await loadConfig(path);
} catch (e) {
  throw new Error("Config failed");   // original stack trace and message lost
}
```

The original error is swallowed; the replacement carries no cause chain. Flag when the original `e` is not passed to the replacement (e.g., `new Error("...", { cause: e })`).

## 7. Async/await with missing `await` inside catch

```ts
async function save(data) {
  try {
    await db.insert(data);
  } catch (err) {
    logger.error(err);   // logger.error returns a Promise, not awaited
  }
}
```

If the logger is async and not awaited, the log may not flush before the process exits, making the swallowing even more complete.

## 8. `Promise.allSettled` result checked incompletely

```ts
const results = await Promise.allSettled([a(), b(), c()]);
results.forEach(r => console.log(r.value));   // rejected results have no .value
```

`allSettled` collects rejections as `{ status: "rejected", reason: ... }`. Accessing `.value` on a rejected result silently yields `undefined`.

## 9. Event emitter error event not handled

```ts
const stream = fs.createReadStream(path);
stream.on("data", chunk => process(chunk));
// no "error" handler
```

Node `EventEmitter` without an `"error"` listener will throw uncaught exceptions or silently drop them depending on the version and context.

## 10. Blanket catch that erases failure detail

```ts
async function processOrder(order) {
  try {
    await validateOrder(order);
    await chargeCard(order);
    await fulfillOrder(order);
  } catch (e) {
    return { success: false };   // caller gets false for *any* failure — no discrimination
  }
}
```

A blanket catch that maps all errors to the same return value prevents callers from distinguishing transient failures (retry-able) from permanent ones (don't retry). Flag when the returned type gives no failure detail.

---

## Evidence required

Gather **at least two** before reporting:

1. **Catch evidence** — a `catch` block or `.catch(...)` that does not re-throw, propagate, or take a meaningful recovery action.
2. **Scope evidence** — the caught exception is discarded: binding unused, named `_`, or only passed to `console.log`/`logger.debug` with no re-throw.
3. **Caller evidence** — the calling code has no other way to learn the operation failed.
4. **Context evidence** — silent failure would cause user-visible data loss, incorrect state, or a downstream crash harder to diagnose than the original error.

---

## Patterns to **not** flag

- Catch that calls `throw e` or `throw new SpecificError("...", { cause: e })` — error propagates with cause chain
- Catch that invokes a continuation: `callback(err)`, `reject(err)`, `next(err)`
- Catch in a test that asserts the error: `expect(() => fn()).toThrow()`
- Catch in a finalizer/cleanup path documented as best-effort
- `process.on("uncaughtException", ...)` handlers that log and exit — intentional top-level boundaries

---

## Comment examples

**Good:**

> **Blocking:** The `catch` block at line 58 discards the exception from `writeFile()` without logging or re-throwing. Callers at line 72 proceed to read the file as if the write succeeded. Could we re-throw here, or return a `Result` type so callers can detect the failure?

> **Suggested:** `fetchUser(id).catch(() => {})` at line 34 silently resolves the promise to `undefined`. Any `.then()` consumer downstream will receive `undefined` for a user that failed to load. Should this propagate the rejection, or at least return a typed sentinel the caller can check?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Catch block is completely empty | Assert: "`catch (e) {}` at line N will silently hide any failure from `op()`..." |
| Catch logs but does not re-throw | Assert: "The `catch` logs but the caller has no way to detect the failure..." |
| Catch returns a default whose meaning is ambiguous | Ask: "Does the caller at line N distinguish a genuine empty result from a parse failure?" |
| Re-throw is missing the cause chain | Ask: "Should the original `e` be passed as `{ cause: e }` so the root cause is preserved?" |