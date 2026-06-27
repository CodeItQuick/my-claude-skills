# Detection Patterns — Concurrency and Timing

Patterns where shared mutable state, asynchronous callbacks, or concurrent operations interact in ways the author did not account for. Each pattern is a *candidate*, not a finding — apply the evidence rules in `skill.md` and the concurrency-and-timing suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. Read-modify-write across an `await` boundary on shared mutable state

```ts
let requestCount = 0;

async function handleRequest() {
  requestCount++;                     // read
  await processRequest();             // yield — another call may run here
  requestCount--;                     // write on stale value
}
```

Between the `++` and the `await`, another call to `handleRequest` may execute and mutate `requestCount`. The decrement after the await operates on a value that may have been incremented by a concurrent execution. The counter drifts.

## 2. `setTimeout` / `setInterval` callback closing over loop variable

```ts
for (var i = 0; i < items.length; i++) {
  setTimeout(() => process(items[i]), i * 100);
}
```

`var` is function-scoped, not block-scoped. By the time the callbacks fire, `i` equals `items.length` in all of them — every callback processes `items[items.length]` (`undefined`), not the intended item. The same pattern occurs with `let` when the variable is reassigned before the callback fires.

## 3. Promise not awaited, error silently discarded

```ts
async function saveAndNotify(user: User) {
  db.users.update(user);             // not awaited
  await emailService.send(user.email, "Profile updated");
}
```

The database update is fired and forgotten. If it rejects, the rejection is unhandled (a Node.js `UnhandledPromiseRejection`). The email is sent immediately without waiting for the save to succeed, meaning the notification may confirm a change that failed.

## 4. Cache populated then read across an async boundary without invalidation

```ts
async function getUser(id: string): Promise<User> {
  if (cache.has(id)) return cache.get(id)!;
  const user = await db.users.findById(id);
  cache.set(id, user);
  return user;
}

async function updateUser(id: string, data: Partial<User>) {
  await db.users.update(id, data);
  // cache not invalidated — stale value served after update
}
```

After `updateUser` completes, `getUser` returns the cached pre-update value until the cache entry expires. Two concurrent calls to `getUser` may also both miss the cache, both fetch, and the second write overwrites the first without the TOCTOU race being visible.

## 5. `Promise.all` over operations with partial-success side effects

```ts
await Promise.all([
  db.orders.create(order),
  inventory.reserve(order.items),
  emailService.send(customer.email, confirmationEmail),
]);
```

If any one of the three operations fails, the others may have already succeeded. An order can be created without inventory reserved; a confirmation email can be sent for an order that fails to persist. `Promise.all` rejects on the first failure with no rollback mechanism.

## 6. `async` event handler whose errors are silently swallowed by the emitter

```ts
emitter.on("data", async (chunk) => {
  await processChunk(chunk);          // if this throws, the error disappears
});
```

Node.js `EventEmitter` does not await async listeners. If the async function rejects, the rejection is unhandled — `emitter.emit("error", ...)` is not called, and the error is not propagated to the caller. Errors in async listeners require explicit `try/catch` + `emitter.emit("error", err)`.

## 7. State mutated synchronously after an `await` that reads the same state

```ts
async function deactivate(userId: string) {
  const user = await db.users.findById(userId);  // read
  if (user.status === "active") {
    await db.users.update(userId, { status: "inactive" });  // write
  }
}
```

Between the read and the write, another concurrent `deactivate` call may have already set `status` to `"inactive"`. The check-then-act window allows a double-deactivation or a deactivation of already-inactive users. The fix is an atomic conditional update (`UPDATE … WHERE status = 'active'`).

---

## Patterns to **not** flag

- **Single-threaded code with no async boundary** — pure synchronous code in a single execution context has no interleaving; do not flag read-modify-write sequences that cannot be interrupted.
- **Immutable shared state** — `Object.freeze`, `readonly`, `const` records, or clearly documented read-only references shared across async operations.
- **Atomic operations provided by the platform** — Redis `INCR`, database `UPDATE … WHERE`, `Atomics.*` on `SharedArrayBuffer` are atomic by specification.
- **`async_hooks` / `AsyncLocalStorage` for per-request context** — these are designed for sharing context across async continuations and are not races.
- **Tests using `Promise.all` on independent fixtures** — test setup that runs non-interfering operations concurrently is intentional.