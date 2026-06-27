# Detection Patterns — Resource Lifetime

Patterns where a resource's close/release/destroy is missing, reachable only on the happy path, or called in a way that does not cover all exit points. Each pattern is a *candidate*, not a finding — apply the evidence rules in `skill.md` and the resource-lifetime suppression rules in `../shared/suppression-rules.md` before reporting.

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

## Patterns to **not** flag

- **`using` / `Symbol.dispose` / `with` statement** — the language guarantees cleanup.
- **`finally` block that always releases** — the resource is closed on all exit paths.
- **Framework-managed resources** — connection pools, ORM-managed transactions, and server handles managed by a framework lifecycle (Express, Fastify, NestJS `onModuleDestroy`) where the framework guarantees cleanup.
- **In-memory objects with no OS or external resource** — a plain object, array, or Map going out of scope is collected by the GC with no explicit release needed.
- **Short-lived script context** — a CLI process that exits immediately after use; the OS reclaims all handles on exit.
- **Test setup that uses `afterEach`/`afterAll` for cleanup** — the test framework guarantees release after each test or suite.