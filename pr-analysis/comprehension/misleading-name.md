# Detection Patterns — Misleading Name

Patterns where a name's implicit contract — what the identifier promises about behavior, value, or units — is violated by the actual implementation. This is distinct from `inconsistent-abstraction-in-name`, which targets vocabulary *level* mismatches; this pass targets *accuracy* mismatches where the name is at the right level but says the wrong thing. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the misleading-name suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. Query-named function that mutates or deletes

```ts
function getUser(id: string): Promise<User> {
  await auditLog.record("user_accessed", id);
  return db.users.findById(id);
}

async function findExpiredSessions(): Promise<Session[]> {
  const sessions = await db.sessions.findExpired();
  await db.sessions.deleteMany({ expired: true });   // deletes while named "find"
  return sessions;
}
```

Names starting with `get`, `find`, `fetch`, `load`, `read`, `is`, `has`, or `check` create a strong expectation of purity — callers treat them as safe to call repeatedly, in tests, or in conditions. A function with that name that mutates state, deletes records, or writes to a log violates that expectation silently.

## 2. Boolean variable or parameter named for its inverse

```ts
const isDisabled = true;   // enables the feature
if (!isDisabled) { /* the intended guard */ }

function render(hidden: boolean) {
  if (!hidden) showModal();   // "hidden = false" shows the modal
}

const notActive = user.status === "active";   // named for the negative of its value
```

A boolean whose name says the opposite of its meaning forces every reader to apply a mental negation before understanding the code. This is particularly harmful in parameter lists where the caller passes `hidden: false` to mean "show it".

## 3. Name omits a load-bearing unit

```ts
const timeout = 5000;         // milliseconds? seconds?
setTimeout(flush, timeout);   // wrong if timeout was meant as seconds

function delay(ms: number) { ... }
delay(timeout);               // passes correctly only by coincidence

const maxSize = 100;          // bytes? kilobytes? items?
if (data.length > maxSize) reject();

function setExpiry(ttl: number) { ... }
setExpiry(86400);             // seconds? milliseconds? days?
```

When the unit is part of the correctness contract — timeout durations, memory sizes, distances, rates — omitting it from the name means every caller must look up the convention independently and may get it wrong. A mismatch between `timeout` (assumed seconds) and `setTimeout` (requires milliseconds) is a silent correctness bug.

## 4. Name promises a single concern but the function does several

```ts
async function saveUser(user: User): Promise<void> {
  await db.users.upsert(user);
  await emailService.sendWelcome(user.email);
  await analyticsQueue.push({ event: "user_saved", userId: user.id });
}

function validateAndSaveConfig(path: string): Config {
  // 40 lines of parsing, validation, persistence, and cache-warming
}
```

`saveUser` announces persistence but also sends email and pushes analytics. `validateAndSaveConfig` encodes two actions in the name, suggesting the author knew the function was doing more than one thing but expressed it as a name rather than splitting it. Callers who expect only the named concern will be surprised by the side effects they did not ask for.

## 5. Name implies a collection but returns a scalar, or vice versa

```ts
function getUsers(): Promise<User> { ... }   // returns one User, not many

const userList = await getUser(id);          // returns User[], named as singular

function getActiveCount(): number[] { ... }  // returns an array, named as a count
```

Singular/plural signals the return shape. `getUser` implies one; `getUsers` implies many. When the implementation contradicts the grammar, every call site is a potential type mismatch or a misunderstanding of what was returned.

## 6. Name implies immutability but the value is mutable and shared

```ts
const DEFAULT_CONFIG = {
  timeout: 5000,
  retries: 3,
};

// elsewhere:
DEFAULT_CONFIG.timeout = 10000;   // mutates the "default"

const EMPTY_ARRAY: string[] = [];
export { EMPTY_ARRAY };
// consumer:
EMPTY_ARRAY.push("x");            // mutates the exported "empty" array
```

`SCREAMING_SNAKE_CASE` and names like `DEFAULT_*`, `EMPTY_*`, `INITIAL_*` create a strong expectation that the value will not change. Exporting a mutable reference under such a name allows consumers to corrupt the shared state.

---

## Evidence required

Gather **at least two** before reporting:

1. **Contract evidence** — the name establishes an implicit promise: a `get*`/`find*`/`is*` prefix promises purity; `SCREAMING_SNAKE_CASE` promises immutability; a singular noun promises a single value; omitting a unit promises the unit is irrelevant or universally agreed.
2. **Violation evidence** — the implementation breaks the promise: the function deletes or writes, the exported constant is mutated, the function returns a collection, or the identifier's unit determines correctness and differs from what callers assume.
3. **Caller harm evidence** — a caller relying on the name's implicit contract would produce incorrect behavior: a test calling a `get*` function in a setup phase that unexpectedly deletes data, an arithmetic operation on a unitless value producing a silent magnitude error, a consumer mutating a shared `DEFAULT_*` object and corrupting other callers.
4. **Absence of documentation** — no adjacent comment, type annotation, or module-level convention explains the deviation, so the caller has no way to discover the contract violation without reading the implementation.

---

## Patterns to **not** flag

- **Accepted conventions with documented semantics** — if the module's README or a clear comment states all durations are milliseconds, omitting `Ms` from every identifier is a style choice, not a misleading name.
- **Framework-prescribed names** — `handleRequest`, `resolveQuery`, `beforeEach`, `teardown` — the framework defines the contract, not the implementer.
- **Names where the side effect is the primary purpose** — `saveUser` in a module explicitly named `user-persistence` where "save" is the documented contract. The behavior matches the name at the right level of abstraction.
- **`getOrCreate` and similar established compound idioms** — the mutation is signaled by the compound verb and is conventional in the domain.
- **Test helpers and builder functions** — `buildUser`, `createTestOrder`, `makeStub` are creation idioms even if the function also registers cleanup.
- **Negated names that are the primary domain term** — `isDisabled`, `isHidden`, `isSuspended` where the negative is the natural domain concept (a feature flag that defaults to off, a user status). Flag only when the value assigned to the name is also negated relative to its meaning.