# Suppression Rules

A noisy reviewer is worse than a quiet one. **When in doubt, suppress.** This file lists the cases where a candidate looks like a swallowed exception but should not be reported.

## Hard suppressions (always)

Suppress without further analysis when any of these are true:

### S1. The error is re-thrown or propagated

```ts
try {
  await op();
} catch (e) {
  throw e;                          // direct re-throw
}

try {
  await op();
} catch (e) {
  throw new AppError("msg", { cause: e });  // wrapped with cause
}
```

Any form of `throw` in the catch body, including wrapping with `{ cause: e }`, means the error is not swallowed.

### S2. The error is passed to a continuation

```ts
try {
  await op();
} catch (err) {
  callback(err);     // Node-style callback
  reject(err);       // Promise rejection
  next(err);         // Express/Koa error middleware
  observer.error(err); // RxJS
}
```

The error is handed off to a downstream handler. The catch is a translation layer, not a suppressor.

### S3. The catch is intentional and documented

```ts
try {
  cache.set(key, value);
} catch (_) {
  // Cache is best-effort; failure does not affect correctness.
}
```

A comment that explains *why* proceeding is safe — not merely that this is intentional — is sufficient to suppress. "intentional" alone is not enough; the comment must state *why* it is safe.

### S4. Best-effort / cleanup code with no caller dependency

```ts
async function closeConnection() {
  try {
    await conn.close();
  } catch {
    // Ignore: connection may already be closed
  }
}
```

When the operation is a cleanup/finalizer, the connection state is already terminal, and callers are not checking the return value of the close call, suppress.

### S5. Test code asserting that an error is thrown

```ts
it("throws on bad input", async () => {
  await expect(processOrder(null)).rejects.toThrow();
});
```

Tests that deliberately trigger errors are not swallowing them — they are asserting on them.

### S6. The catch body calls a dedicated error-handling function

```ts
try {
  await op();
} catch (err) {
  handleError(err);    // clearly named; we cannot see inside, but naming is evidence
  reportToSentry(err);
  logError(err);
}
```

If the function name clearly signals error handling (`handleError`, `reportError`, `logError`, `captureException`, `trackError`), suppress. If the name is ambiguous (`process(err)`, `run(err)`), do not suppress.

### S7. The dereference is unchanged code

If the catch block in question is not part of the diff, do not report it. This skill reviews *what changed*. Pre-existing tech debt is out of scope unless the user explicitly asks.

### S8. Error is used to set an error state visible to callers

```ts
try {
  await load();
} catch (err) {
  this.error = err;      // stored for caller to inspect
  this.status = "failed";
}
```

If the exception is recorded in a field, context, or observable state that the caller can read, it is not swallowed — it is converted to a different signal.

## Full suppressions from partial handling

These cases look like swallowed exceptions but have enough mitigation to suppress entirely:

### D1. Log-only catch at `warn` or `error` level (not `debug`/`log`)

```ts
} catch (err) {
  logger.error("Save failed", { err });
}
```

`logger.error` / `logger.warn` makes the failure visible in observability tooling. Suppress. A bare `console.log` does not qualify — it is too easy to miss in production.

### D2. Catch returns a typed sentinel the caller visibly checks

```ts
try {
  return await parse(raw);
} catch {
  return null;    // caller: if (result === null) { ... }
}
```

If the caller is visible in the diff and does check the sentinel, suppress. If the caller is not visible or does not check, do not suppress.

### D3. The catch is inside a retry wrapper that re-throws on the final attempt

```ts
for (let i = 0; i < 3; i++) {
  try {
    return await op();
  } catch (e) {
    if (i === 2) throw e;  // re-throws on final attempt
    await sleep(delay);
  }
}
```

The final iteration re-throws, so the error is not permanently swallowed. Suppress.

## Anti-suppressions (do NOT suppress)

These look handled but aren't:

### A1. Log-only at `console.log` or `logger.debug`

```ts
} catch (err) {
  console.log(err);       // DEBUG-level noise, easily filtered out
}
```

`console.log` is not error handling. Do not suppress.

### A2. The throw is behind a condition that may not execute

```ts
} catch (err) {
  if (shouldRethrow) throw err;   // may silently swallow
}
```

Conditional re-throw is not the same as unconditional re-throw. Still flag.

### A3. Error is assigned to a local variable that is never used

```ts
} catch (err) {
  const ignored = err;    // binding is created but unused
}
```

Assigning to a local does not constitute handling. Still flag.

### A4. Re-thrown error is missing the cause chain

```ts
} catch (e) {
  throw new Error("Something went wrong");   // `e` is not included
}
```

Without `{ cause: e }` (JS) or equivalent chaining, the original stack trace is lost. Still flag, at `medium` severity, with a suggested fix to add the cause.