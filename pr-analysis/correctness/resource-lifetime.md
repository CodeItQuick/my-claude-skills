# Detection Patterns — Resource Lifetime

Patterns where a resource's close/release/destroy is missing, reachable only on the happy path, or called in a way that does not cover all exit points. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the resource-lifetime suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. Resource opened in `try`, closed only in happy-path body

```ts
const conn = await pool.connect();
const result = await conn.query(sql);
conn.release();          // only reached if query succeeds
return result;
```

If `conn.query(sql)` throws, `conn.release()` is never called. The connection leaks back into the pool in an acquired state, eventually exhausting the pool under error load. The fix is a `finally` block or a `try/using` pattern.

## 2. Stream created without a corresponding `destroy` on the error path

```ts
const readStream = fs.createReadStream(filePath);
readStream.pipe(transformStream).pipe(writeStream);

writeStream.on("error", (err) => {
  writeStream.destroy();
  reject(err);
});
// readStream and transformStream not destroyed on error
```

When `writeStream` errors, only `writeStream` is cleaned up. `readStream` and `transformStream` remain open, holding the file handle and any underlying resources until GC runs. All streams in a pipeline must be destroyed on any error.

## 3. Timer started but never cleared when the owning object is disposed

```ts
class Poller {
  private timer: NodeJS.Timeout;

  start() {
    this.timer = setInterval(() => this.poll(), 5000);
  }

  async poll() { ... }

  // no stop() / no clearInterval
}
```

If `Poller` is used in a component that mounts and unmounts (React, a server request handler), the interval continues firing after the owning object is gone. Each instance that is not cleaned up creates a leak that accumulates callbacks and holds object references.

## 4. Event listener added but never removed

```ts
class DataFetcher {
  constructor(private emitter: EventEmitter) {
    emitter.on("data", this.handleData.bind(this));
  }

  handleData(data: unknown) { ... }
  // no removeListener / no off
}
```

Each `DataFetcher` instance adds a listener but never removes it. When the instance is discarded, the listener remains in the emitter's list, preventing GC of the instance and firing `handleData` after the instance is logically dead. Node.js warns at 11+ listeners; the real issue is the logic running on a dead object.

## 5. Database transaction started without a guaranteed rollback on error

```ts
const tx = await db.beginTransaction();
const user = await tx.users.create(userData);
await tx.orders.create({ userId: user.id, ...orderData });
await tx.commit();
// no rollback if create throws
```

If `tx.orders.create` throws, `tx.commit()` is never called, but neither is `tx.rollback()`. Many databases auto-rollback idle transactions eventually, but the open transaction holds locks, blocks other operations, and may remain open for minutes until a timeout fires.

## 6. Resource acquired inside a loop with cleanup outside the loop

```ts
const results = [];
for (const file of files) {
  const handle = await fs.open(file, "r");
  results.push(await readChunk(handle));
}
await handle.close();   // only closes the last handle; earlier ones leak
```

The `close()` is outside the loop and references the last binding of `handle`. All prior file handles are never closed.

---

## Evidence required

Gather **at least two** before reporting:

1. **Acquisition evidence** — a resource is opened or acquired: `fs.open`, `pool.connect`, `createReadStream`, `setInterval`, `emitter.on`, or any operation that returns a handle requiring explicit release.
2. **Release evidence** — the corresponding release (`close`, `release`, `destroy`, `clearInterval`, `removeListener`) is absent, or is only reachable on the happy path (not in a `finally` block).
3. **Error path evidence** — a `throw`, `return`, or `await` in the same scope can exit the function before the release is reached.
4. **Impact evidence** — the leak is observable: connection pool exhaustion, open file descriptor accumulating, timer firing on a dead object, or listener accumulating across multiple instances.

---

## Patterns to **not** flag

- **`using` / `Symbol.dispose` / `with` statement** — the language guarantees cleanup.
- **`finally` block that always releases** — the resource is closed on all exit paths.
- **Framework-managed resources** — connection pools, ORM-managed transactions, and server handles managed by a framework lifecycle (Express, Fastify, NestJS `onModuleDestroy`) where the framework guarantees cleanup.
- **In-memory objects with no OS or external resource** — a plain object, array, or Map going out of scope is collected by the GC with no explicit release needed.
- **Short-lived script context** — a CLI process that exits immediately after use; the OS reclaims all handles on exit.
- **Test setup that uses `afterEach`/`afterAll` for cleanup** — the test framework guarantees release after each test or suite.

---

## Comment examples

**Good:**

> **Blocking:** `conn = await pool.connect()` at line 14 is not released in a `finally` block. If `conn.query(sql)` throws, `conn.release()` at line 17 is never reached and the connection leaks. Could the release move into a `finally` block?

> **Suggested:** The `readStream` at line 22 is not destroyed when `writeStream` emits an error. If the write fails, `readStream` stays open and holds the file handle. Could we call `readStream.destroy()` in the `writeStream` error handler alongside `writeStream.destroy()`?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Cleanup only in happy path, not `finally` | Assert: "`conn.release()` is only reached if `query()` succeeds — a `finally` block would cover the error path." |
| Stream not destroyed on sibling error | Ask: "Does destroying `writeStream` on error also clean up `readStream`, or does `readStream` need its own `destroy()` call?" |
| `setInterval` with no `clearInterval` | Ask: "Is there a `stop()` method or lifecycle hook that calls `clearInterval` on this timer?" |
| Loop opens resource, cleanup is outside loop | Assert: "Only the last `handle` is closed — handles from earlier iterations are never released." |