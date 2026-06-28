# Detection Patterns — Interface Contract Violation

Patterns where code interacts with an external interface in a way that violates the interface's documented contract, producing incorrect behavior that is invisible to the type checker. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the interface-contract-violation suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. Arguments passed in the wrong order to a well-known API

```ts
// fs.rename(oldPath, newPath, callback)
fs.rename(newPath, oldPath, callback);

// Array.prototype.splice(start, deleteCount, ...items)
arr.splice(items, 0, start);
```

Standard library functions have positional contracts. When argument types are identical or compatible, the type checker accepts the transposition silently. The operation runs but performs the wrong action — renaming in the wrong direction, splicing the wrong position.

## 2. Callback parameter order assumed incorrectly

```ts
// Node-style callback: (error, result)
fs.readFile(path, "utf8", (result, err) => {
  if (err) throw err;         // err is actually the file contents
  console.log(result);        // result is actually the error (null on success)
});
```

Node.js callbacks follow `(err, result)` convention. Swapping the parameters means `err` receives the file contents and `result` receives `null` (the error value on success). The `if (err)` check then throws the file contents as an error, or passes when there is an actual error.

## 3. Async function called without `await`, return value discarded

```ts
async function deleteUser(id: string) {
  db.users.delete(id);        // Promise returned but not awaited
  return { success: true };   // returned before delete completes
}
```

The database call starts but is not awaited. The function returns `{ success: true }` before the delete finishes. If the delete fails, the rejection is unhandled and the caller receives a success response for a failed operation. Distinct from `swallowed-exceptions` because no catch is involved — the promise is simply ignored.

## 4. Mutating method called when a non-mutating method was intended

```ts
const sorted = items.sort(comparator);           // mutates items in place, returns same ref
const unique = [...new Set(items)].sort();        // fine

const filtered = items.filter(x => x.active);   // returns new array — fine
const result = items.splice(0, 5);              // caller expects first 5, but items is now modified
```

`Array.sort` and `Array.splice` mutate the receiver. When the caller stores the return value expecting a derived copy while the original is also mutated, both references reflect the change. This is especially subtle when the function name implies a pure query (`getSorted`, `getFirstFive`).

## 5. API return value semantics misread

```ts
// String.prototype.replace returns a new string — does not mutate
str.replace(/foo/, "bar");   // result discarded
console.log(str);            // still contains "foo"

// Array.prototype.forEach returns undefined — not chainable
const result = items.forEach(transform).filter(Boolean);  // TypeError
```

Some APIs return a new value (strings, most array methods). Using the return value is necessary to observe the effect. Calling the method and discarding the return value silently produces no change.

## 6. `setTimeout` / `setInterval` delay interpreted as seconds instead of milliseconds

```ts
const FIVE_SECONDS = 5;
setTimeout(callback, FIVE_SECONDS);   // fires in 5ms, not 5 seconds
```

`setTimeout` takes milliseconds. A constant named in seconds but passed directly produces a timer that fires 1000× faster than intended. The bug is invisible to the type checker since both values are `number`.

## 7. Deprecated API used where the replacement has different semantics

```ts
// crypto.createCipher is deprecated — it derives the key from a password using a weak KDF
const cipher = crypto.createCipher("aes-256-cbc", password);

// crypto.createCipheriv requires an explicit key and IV
// Replacing one with the other changes the key derivation entirely
```

Deprecated APIs are often replaced by ones with subtly different semantics, not just a renamed interface. Using the deprecated form produces behavior that is explicitly rejected by the platform's security guidance, even if it compiles and runs without errors.

---

## Evidence required

Gather **at least two** before reporting:

1. **Contract evidence** — the API's documented signature (argument order, callback convention, return value semantics, async contract) is established: from the standard library, a popular third-party library, or visible in the diff.
2. **Violation evidence** — the call in the diff deviates: arguments are transposed, the async return value is not awaited, the callback parameters are in the wrong order, or a deprecated API is used where the replacement has different semantics.
3. **Type silence evidence** — the type checker accepts the call without error because the argument types are compatible (both `string`, both `number`), hiding the violation at compile time.
4. **Impact evidence** — the concrete incorrect behavior: operation runs backwards, rejection goes unhandled, callback receives the error as its value, or a security-relevant invariant is violated.

---

## Patterns to **not** flag

- **Internal function calls** — calls to functions defined in the same codebase where the signature is visible in the diff. Use `mutation-of-input` or `wrong-output` for those.
- **Well-typed call where TypeScript already enforces argument order** — if the types are distinct and strict, transposition is caught at compile time.
- **Documented intentional workarounds** — a comment citing a specific library issue or known deviation from the interface spec suppresses the finding.
- **Deprecated API used with an explicit migration comment** — the usage is acknowledged.
- **Platform-specific behavior that is tested** — if a companion test explicitly asserts the surprising behavior, the author is aware.

---

## Comment examples

**Good:**

> **Blocking:** `fs.rename(newPath, oldPath, cb)` at line 19 has the arguments in the wrong order. `fs.rename` takes `(oldPath, newPath, callback)` — as written, the rename runs backwards, moving `newPath` to `oldPath`. Could we swap the first two arguments?

> **Suggested:** `db.users.delete(id)` at line 31 is called without `await`. The function is `async` and returns a `Promise`. The deletion is fired and forgotten — if it rejects, the rejection is unhandled and the caller receives a response before the delete completes. Should this be `await db.users.delete(id)`?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Well-known API with arguments transposed | Assert: "`fs.rename(newPath, oldPath, cb)` — the first two arguments are swapped; the rename runs backwards." |
| Node-style callback with `(result, err)` | Assert: "Node callbacks are `(err, result)` — `result` receives the error and `err` receives the value." |
| Async function called without `await` | Ask: "Is `db.users.delete(id)` intentionally fire-and-forget, or should it be awaited so the caller knows when it completes?" |
| Deprecated API used | Ask: "Is `crypto.createCipher` intentional here? It was deprecated in Node 10 and the replacement `createCipheriv` has different key-derivation semantics." |