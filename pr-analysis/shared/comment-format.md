# Comment Format

Review comments are the user-facing output. They must be specific, actionable, and proportional to severity. The structured finding is the source of truth — the comment is just a derivation.

## Structure

```
{Severity}: {what may fail or is wrong and where}. {why it may fail or is incorrect}. {suggested action, often as a question}.
```

## Severity labels

- **`Blocking:`** — high confidence, the bug is demonstrable; the change should not merge until addressed.
- **`Suggested:`** — high confidence but not demonstrably broken; author should consider but may have context that makes it OK.
- **`Optional:`** — low-stakes improvement. Use sparingly; usually suppress instead.

Do not use bare statements without a label. The severity label tells the author whether they must act.

## Phrasing rules (all passes)

1. **Name the expression.** Quote it in backticks and cite the line number. The author should be able to find it without re-reading the diff.
2. **State the failure mode or incorrect behavior.** "may throw", "silently discarded", "is always true in this branch" — be concrete.
3. **Cite the evidence.** Mention the source operation, type, or sibling code that makes this suspicious.
4. **End with a question or suggestion**, not a command. The author may have context you don't.
5. **One concern per comment.** Post two comments for two distinct issues, even in the same function. Don't bundle.

## Length

Keep each comment to 2–4 sentences. If you find yourself writing a paragraph, the issue probably needs a design discussion, not a line comment.

---

## Pass-specific examples

### `null-access`

**Good:**

> **Blocking:** `user.name` on line 42 is read before `user` is checked. `users.find(...)` returns `undefined` when no match exists, and the guard at line 47 is unreachable. Could we move the guard above the access, or throw a `UserNotFoundError`?

> **Suggested:** `session.touch()` may throw because `sessions.get(sessionId)` returns `undefined` for unknown sessions. If the session is guaranteed to exist here, could we add an `assertExists` to make that contract explicit?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Type system clearly says nullable, no guard at all | Assert: "`x.y` will throw because `x` is undefined when ..." |
| Type system silenced via `!` or `as` | Ask: "Is `x` guaranteed non-null here? The `!` removes the type error but ..." |
| Source operation can return undefined but you can't see the contract | Ask: "Does `getUser(id)` always return a user, or can it return null?" |
| Guard exists but might not cover all branches | Ask: "Does the guard at line N cover the path through line M?" |

---

### `swallowed-exceptions`

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

---

### `suspicious-conditional`

**Good:**

> **Blocking:** `if (retries > MAX_RETRIES)` at line 37 runs one extra iteration — when `retries` equals `MAX_RETRIES` the condition is still false and the loop body executes again. `retryWithDelay` in the same file uses `>=` for the same invariant. Should this be `>= MAX_RETRIES`?

> **Suggested:** `if (isEnabled === "true")` at line 14 — `isEnabled` is typed as `boolean`, which is never the string `"true"`, so this branch can never execute. Did you mean `=== true`, or is `isEnabled` expected to be a string from an environment variable?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Condition is provably tautological given the type | Assert: "`if (count === null)` can never be true — `count` is `number`." |
| Off-by-one where boundary value is defined by a constant | Assert: "With `>`, the loop executes when `retries === MAX_RETRIES`, which exceeds the intended limit." |
| Duplicate condition in chain | Assert: "The branch at line N is dead — `status === 'active'` is already tested at line M." |
| Operator precedence where intent is unclear | Ask: "Is this `a || (b && c)` or `(a || b) && c`? The current form evaluates as the former." |
| Suspicious boundary where the correct value isn't obvious | Ask: "Should this be `>=` to include the boundary, or is `>` intentional here?" |

---

### `mutation-of-input`

**Good:**

> **Blocking:** `items.sort(comparator)` at line 31 sorts the caller's array in-place. `items` is the parameter — the caller's original array is silently reordered. `transform` in the function name implies a new array is returned. Could we use `[...items].sort(comparator)` instead?

> **Suggested:** `cart.discounts.push(newDiscount)` at line 18 mutates the `discounts` array on the passed `cart` object. If callers expect `applyDiscount` to return a new cart, both the original and the returned reference now have the discount applied. Should this operate on a copy?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| In-place array method (`sort`, `push`, `splice`) on a parameter | Assert: "`items.sort()` mutates the caller's array — callers named `transform*` expect a copy." |
| Property assignment directly on a parameter object | Assert: "`order.status = 'paid'` mutates the object the caller passed — is that the intended contract?" |
| Function name is ambiguous about mutation | Ask: "Does `processCart` guarantee it returns a new cart, or may it mutate the passed one?" |
| Shallow spread that still shares nested objects | Ask: "This spreads `order` but `order.items` is still the same reference — is mutation of `items` safe here?" |

---

### `boolean-flag-splitter`

**Good:**

> **Blocking:** `renderList(items, true)` at line 44 and `renderList(items, false)` at line 67 both pass literal booleans — every call site has already made a static choice. The two branches inside `renderList` differ in their output shape and side effects. Could these be two functions: `renderDetailedList` and `renderSummaryList`?

> **Suggested:** The `verbose` parameter at line 12 controls branches where the two paths share almost no code — one fetches full records, the other returns IDs only. Since every call site passes a literal, would `fetchFull` and `fetchIds` as separate functions make the intent clearer at the call site?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Every call site passes a literal, branches are fundamentally different | Assert: "The `format` flag is always a literal at call sites; the branches differ enough to be separate functions." |
| Branches diverge but share significant setup code | Ask: "Would `exportAsCsv` and `exportAsJson` be clearer than a `format` flag, given how different the branches are?" |
| Flag is passed through an intermediate that doesn't use it | Ask: "Is `includeMetadata` used by `formatReport` directly, or just threaded through to `renderSection`?" |

---

### `passthrough-wrapper`

**Good:**

> **Suggested:** `UserRepository.findById` at line 8 only calls `this.db.users.findById(id)` and returns the result with no transformation, error translation, or added behavior. Callers could import `db.users.findById` directly. Is there planned behavior that makes this wrapper worth keeping?

> **Suggested:** The `notify` method at line 24 maps 1:1 to `emailService.send(to, subject, body)` with no logging, retry, or error handling. If it exists to enable mocking in tests, would injecting `emailService` directly into callers give them more control?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Pure delegation, parameters map 1:1, no cross-cutting concern | Ask: "Does this wrapper add anything callers couldn't get by calling `X` directly?" |
| Wrapper name suggests future behavior | Ask: "Is there planned behavior here, or could callers call `X` directly for now?" |
| Wrapper exists for test isolation | Ask: "If this exists for testability, would injecting `X` directly give callers more flexibility?" |

---

### `implicit-test-ordering`

**Good:**

> **Blocking:** `createdUserId` at line 14 is written by `"creates a user"` and read by `"fetches the created user"` with no `beforeEach` reset. If the fetch test runs first or in isolation, `createdUserId` is `undefined` and the test fails for reasons unrelated to the code under test. Could each test create its own user in a `beforeEach`?

> **Suggested:** `"ships the order"` at line 38 has no arrange step but calls `shipOrder("ord-1")`, relying on a record that `"places an order"` creates. Test runners can run selectively or in randomized order — could `"ships the order"` create its own order instead?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Variable written by test A, read by test B with no reset | Assert: "`sessionId` is set by a different test — this test will fail if run in isolation or after a runner reset." |
| No arrange step, obvious data requirement | Assert: "This test uses `userId = 1` but never creates it — it depends on a prior test having run." |
| `beforeAll` creates mutable shared object | Ask: "Since `cart` is shared across tests and mutated by each one, could `beforeEach` create a fresh instance?" |
| Sequential test names but tests may be self-contained | Ask: "These names imply an order the runner doesn't enforce — could each test arrange its own state?" |

---

### `copy-paste-variation`

**Good:**

> **Suggested:** `getTotalPrice` and `getTotalCost` at lines 12 and 18 are identical except for `item.price` vs `item.cost`. If the reduce logic ever needs to change — rounding, currency conversion, filtering zero-quantity items — it would need to be updated in both places. Could these share a `sumBy(items, key: 'price' | 'cost')` helper?

> **Suggested:** The three event-type blocks at lines 24–36 follow the same two-step pattern (`logger.info` + `metrics.increment`) with only the type string varying. A fourth event type would require a fourth copy. Could `trackEvent(type, event)` replace all three?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Three or more copies of the same block | Assert: "This pattern appears N times with only X varying — a future logic change must be applied to all N copies." |
| Two copies where variation is a single field name | Ask: "Could `getTotalPrice` and `getTotalCost` share a `sumBy(items, key)` helper so the reduce logic lives once?" |
| Two event handlers differing only in field key | Ask: "Could `makeFieldHandler(field)` produce both handlers so the clear-error and set-value logic is defined once?" |
| Duplicated validation with different field names | Ask: "Could these three length checks become `validateMinLength(field, label, min)` calls so the rule is defined once?" |

---

### `boolean-state-machine`

**Good:**

> **Suggested:** `Request` at line 8 tracks its lifecycle with four booleans — `isLoading`, `isLoaded`, `hasFailed`, `isRetrying`. Combinations like `isLoading && isLoaded` are structurally possible but meaningless, and every transition requires resetting multiple flags in sync. Could these collapse to a single `state: 'idle' | 'loading' | 'retrying' | 'loaded' | 'failed'` field?

> **Suggested:** `startFetch`, `onSuccess`, and `onError` at lines 14, 22, and 31 each set `isLoading`, `isLoaded`, and `hasFailed` in tandem. If any transition omits a reset, the object lands in an invalid combination with no type-level protection. Would a single `this.status` assignment make each transition atomic?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Three or more booleans reset together in a method | Assert: "`reset()` zeros four booleans in sync — a single `state = 'idle'` assignment would be atomic and exhaustive." |
| Compound boolean check to determine current state | Ask: "Could `if (!isLoading && !hasFailed && data)` become `if (state === 'loaded')`?" |
| Mutually exclusive booleans (only one true at a time) | Ask: "Could `isAdmin`, `isModerator`, and `isGuest` become `role: 'admin' \| 'moderator' \| 'guest'` to make the mutual exclusion enforced rather than assumed?" |
| Two booleans with one impossible combination | Ask: "Is `isSaving && isSaved` ever possible? If not, a three-state enum would make that unrepresentable." |

---

### `deep-nesting`

**Good:**

> **Suggested:** `processOrder` at line 8 has four levels of nested `if` checks before reaching `charge(order)`. Each guard wraps everything below it rather than returning early. Could we invert each condition to a guard clause (`if (!order) return`, `if (!order.items.length) return`, ...) to bring the main path to the top level?

> **Suggested:** The inner body of the triple-nested loop at line 22 — `for department → for team → for member` — is four levels deep. Could `collectActiveMembers(teams)` extract the inner logic so the outer loop stays at one level and the transformation can be tested in isolation?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Positive condition wraps entire function body | Assert: "The entire body is inside `if (x)` — inverting to `if (!x) return` would eliminate all nesting." |
| Pyramid of successive guards | Ask: "Could each guard return early so the common path isn't buried four levels in?" |
| Nested loops with extractable inner body | Ask: "Could the inner loop body extract to `processTeamMember(member)` to reduce depth and enable unit testing?" |
| Callback pyramid | Ask: "Could this be rewritten with `async/await` to flatten the three nested callbacks?" |
| Nested try/catch | Ask: "Could each operation move to its own function with its own `try/catch` so the happy path stays at one level?" |

---

### `long-parameter-list`

**Good:**

> **Suggested:** `createInvoice` at line 12 takes five positional parameters — `userId`, `orderId`, `amount`, `currency`, and `dueDate`. `userId` and `orderId` are both `string`, so they can be silently transposed with no compile error. Could these become a `CreateInvoiceRequest` options object so call sites are self-documenting?

> **Suggested:** `fetchReport(userId, startDate, endDate, undefined, undefined, "UTC")` at line 44 passes three `undefined` placeholders to reach the `timezone` parameter. An options object would let callers name only the parameters they care about. Would `fetchReport({ userId, startDate, endDate, timezone: "UTC" })` be worth the refactor?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Two or more adjacent same-type params | Assert: "`userId` and `orderId` are both `string` — callers can transpose them silently." |
| Five or more params with a clear grouping | Ask: "Could `firstName`, `lastName`, and `email` group into a `UserDetails` options object?" |
| Call site passes positional literals | Ask: "At line N, `true, false` are hard to read without the signature — would named fields help?" |
| Boolean flags in a long list | Ask: "Could `includeHeaders` and `compress` move into an options object so call sites don't need positional booleans?" |

---

### `primitive-obsession`

**Good:**

> **Suggested:** `createInvoice(userId, orderId)` at line 22 takes two `string` parameters. `userId` and `orderId` are interchangeable at the type level — passing them in the wrong order produces no compile error. Branded types (`UserId`, `OrderId`) or an options object would make the transposition impossible.

> **Suggested:** The format check `email.includes("@") && email.length > 3` appears at lines 17, 44, and 89. An `Email` type that enforces the invariant once at construction would eliminate the scatter and prevent unchecked email strings from flowing through the system.

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Two same-type domain IDs in a function signature | Ask: "Could `userId` and `orderId` be branded types so the compiler catches transpositions?" |
| Same validation duplicated at 3+ call sites | Assert: "This format check appears at N call sites — an `Email` type would centralize the invariant." |
| Unconstrained number with a valid range | Ask: "Should `discountRate: number` be constrained to 0–1? A `Rate` type could carry that invariant." |
| Status string used as a discriminant | Ask: "Would a union type (`'active' | 'suspended' | 'deleted'`) be safer than a raw string here?" |

---

### `feature-envy`

**Good:**

> **Suggested:** `formatInvoiceLine` at line 15 reads `order.taxRate`, `order.discountCode`, and `order.discountAmount` while referencing no state of its own — the logic is entirely derived from `Order`. Could this move to `Order` as a method, or to an `OrderFormatter` class in the same module?

> **Suggested:** `isUserActive` in `user-utils.ts` at line 8 reads `user.status`, `user.deletedAt`, and `user.emailVerified`. This looks like a displaced method — `user.isActive()` would be more discoverable and keep the `User` invariants centralized. Is there a reason this lives outside the `User` class?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Function reads 3+ fields of one object, `this` not referenced | Ask: "Could this move to `X` as a method, since it's entirely derived from `X`'s data?" |
| Utility file accumulating single-type projections | Ask: "These helpers each take `User` and derive a value — would they be more discoverable as `User` methods?" |
| Deep navigation into a nested structure | Ask: "Does `order.customer.contactInfo.email` need to be accessed here, or could `Order` expose a `recipientEmail` property?" |

---

### `mixed-abstraction-levels`

**Good:**

> **Suggested:** `completeOrder` at line 12 calls `validateOrder` and `chargeCustomer` (domain operations), then constructs HTTP headers, base64-encodes a body, and calls `fetch` directly (protocol operations). Could the low-level block extract to `submitToFulfillment(order, payment)` to keep this function at one abstraction level?

> **Suggested:** `processRefund` at line 28 traverses `order.items.filter(...)` and a `reduce` over prices inline, then calls `issueRefund`. Does `processRefund` need to know about item flags and timestamps, or could `order.calculateRefundAmount()` encapsulate the traversal?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Business function with inline HTTP/SQL | Ask: "Could the `fetch` call extract to `submitToFulfillment()` to keep this function at the domain level?" |
| Orchestrator dipping into data structure internals | Ask: "Could `order.calculateRefundAmount()` encapsulate the item traversal so `processRefund` stays domain-level?" |
| Database error code in a service-layer catch | Ask: "Is `23505` a PostgreSQL unique-violation code? Could the repository layer translate this to `DuplicateAccountError`?" |
| Infrastructure setup inside a worker function | Ask: "Could the logger and pool construction move to a factory or composition root so `runJob` contains only execution logic?" |

---

### `overly-clever-one-liner`

**Good:**

> **Suggested:** `~arr.indexOf(x)` at line 18 returns a truthy value when `x` is found and `0` (falsy) when it's not, by exploiting `~(-1) === 0`. This is not a widely recognized idiom — `arr.includes(x)` expresses the same intent directly. Could we use `includes`?

> **Suggested:** The nested ternary at line 31 encodes four status labels across three levels of `? :`. Tracing which label maps to which status requires multiple reads. An object lookup (`STATUS_LABELS[status] ?? "Unknown"`) or `if/else if` chain would be immediately scannable.

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| `~indexOf` or bit shift for non-bit purpose | Ask: "Is `~arr.indexOf(x)` intentional? `arr.includes(x)` would express the same thing more clearly." |
| Nested ternary with 2+ levels | Ask: "This ternary has N levels — would an `if/else if` chain or lookup object be easier to scan?" |
| 4+ chained methods with no named intermediates | Ask: "Could the result after `filter` be named so the data shape at each step is explicit?" |
| Side effect hidden in `&&`/`||` short-circuit | Ask: "Is the mutation in `items.length || items.push(default)` intentional? An `if` would make the control flow explicit." |

---

### `implicit-boolean-coercion`

**Good:**

> **Blocking:** `{count && <span>{count} items</span>}` at line 44 renders `"0"` as a text node when `count` is zero, because `0` is falsy but React renders numeric falsy values. Could we use `{count > 0 && <span>...}` or `{Boolean(count) && ...}`?

> **Suggested:** `const port = config.port || 3000` at line 12 will use `3000` when `config.port` is `0`. Port `0` is a valid OS-assigned value. If the intent is "use the default only when not set", `config.port ?? 3000` would be safer.

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| JSX `{count && ...}` where `count` is `number` | Assert: "`{count && ...}` renders `"0"` as text when count is zero — could we use `count > 0 &&`?" |
| `||` default where `0` or `""` is a valid domain value | Ask: "If `port` can legitimately be `0`, should this use `??` instead of `||`?" |
| `.filter(Boolean)` on an array that may contain `0` or `""` | Ask: "Does this array ever contain `0` or `''` as valid values? `.filter(Boolean)` would silently remove them." |
| Bare truthiness check on a `number` parameter | Ask: "If `limit` can be `0`, `if (!limit)` treats it as missing — is `limit == null` the right check?" |

---

### `inconsistent-abstraction-in-name`

**Good:**

> **Suggested:** In `orders/service.ts`, `createOrder` and `updateOrder` use domain vocabulary, but `deleteFromOrdersTable` at line 34 names a SQL operation. A reader browsing the module can't tell which layer they're in. Could this be `deleteOrder` to match the sibling naming?

> **Suggested:** `httpResponse`, `jsonPayload`, and `dbRecord` at lines 12–14 are infrastructure names inside `processPayment`, a business function. Names like `chargeResult`, `paymentConfirmation`, and `savedPayment` would describe what these values *mean* rather than how they arrived. Does the current naming make the business logic harder to follow?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Sibling functions mixing domain and persistence vocabulary | Ask: "Could `deleteFromOrdersTable` be renamed `deleteOrder` to match `createOrder` and `updateOrder`?" |
| Infrastructure variable names inside business logic | Ask: "Would `chargeResult` be clearer than `httpResponse` here — it names the value's meaning rather than its transport?" |
| Function name encodes storage or transport mechanism | Ask: "Does `fetchUserFromDatabaseByPrimaryKey` need to advertise the mechanism? `getUser(id)` would hide the detail." |
| Query-named function with side effects | Ask: "Does `getUser` also write to the audit log? If so, should the name or the side effect change?" |

---

### `input-validation`

**Good:**

> **Blocking:** `pageNumber * PAGE_SIZE` at line 12 uses `pageNumber` directly from `req.query` without a bounds check. A negative or non-integer value produces a negative offset passed to the database. Could we validate `pageNumber >= 1` and `Number.isInteger(pageNumber)` before the calculation?

> **Suggested:** `parseInt(process.env.TIMEOUT_MS)` at line 8 is used directly as a delay. `parseInt` returns `NaN` when the environment variable is missing or non-numeric, and `delay(NaN)` has implementation-defined behavior. Could we add `Number.isFinite(timeout)` guard with a fallback default?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Raw request param used in path join | Assert: "`path.join(base, req.params.file)` is unguarded — a `..` segment traverses outside the base directory." |
| `parseInt` result used without NaN check | Ask: "If `TIMEOUT_MS` is unset or non-numeric, `parseInt` returns `NaN` — should we default or throw here?" |
| `as Type` cast on external data | Assert: "`req.body.status as Status` asserts a type without validating it — any string passes." |
| Numeric index from user input | Ask: "Does `items[index]` need a bounds check? If `index` is out of range, the access returns `undefined` silently." |

---

### `resource-lifetime`

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

---

### `concurrency-and-timing`

**Good:**

> **Blocking:** `requestCount++` at line 8 and `requestCount--` at line 12 bracket an `await`. Between those lines, concurrent calls to `handleRequest` can mutate `requestCount`, so the final decrement operates on a stale value and the counter drifts. Could this use an atomic or single-point counter?

> **Suggested:** `Promise.all([db.orders.create(...), inventory.reserve(...), emailService.send(...)])` at line 34 has no rollback if one operation fails. The email may be sent for an order that fails to persist. Should these be wrapped in a transaction, or should the email be sent only after the other two succeed?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Read-modify-write on module-level state across `await` | Assert: "The `++` / `--` around `await` allows interleaving — concurrent calls will corrupt `requestCount`." |
| `var` closed over in a loop timer | Assert: "By the time the `setTimeout` fires, `i` equals `items.length` — all callbacks process `undefined`." |
| `Promise.all` with side-effecting operations | Ask: "If `inventory.reserve` fails after `orders.create` succeeds, is there a rollback mechanism?" |
| Async event listener with no `try/catch` | Ask: "If the async handler throws, does the emitter catch it, or does the rejection go unhandled?" |

---

### `interface-contract-violation`

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

---

### `wrong-output`

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

---

### `document-intent`

**Good:**

> **Suggested:** `setTimeout(flush, 86400000)` at line 12 passes a bare millisecond literal. The value is one day, but a reader must do the arithmetic to confirm. Could this be a named constant `ONE_DAY_MS` or a comment like `// 24 h` to make the unit and intent scannable?

> **Suggested:** The bit operation `(ptr + 7) & ~7` at line 34 performs eight-byte alignment, but there is no comment indicating that. A future maintainer who does not recognise the pattern may "simplify" it incorrectly. Would a `// align to 8-byte boundary` comment prevent that?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Magic numeric literal with no constant name | Ask: "Could `86400000` become `ONE_DAY_MS` or a comment stating the unit?" |
| Non-obvious workaround with no comment | Ask: "Is there a known reason for `arr.sort().reverse()` instead of `arr.sort((a, b) => b - a)`? A brief comment would protect this from being 'simplified' away." |
| Side-effecting function with a query name | Ask: "Does `getUser` also write to the audit log? If so, should the name or the JSDoc mention the side effect?" |
| Complex regex with no description | Ask: "Could this regex have a named constant and a one-line comment describing what it matches?" |

---

### `flag-debt-explicitly`

**Good:**

> **Suggested:** `// TODO: fix this` at line 18 has no ticket reference or resolution condition. It will remain indefinitely with no mechanism to resurface it. Could we add a ticket number or a stated condition (`// TODO(PROJ-123): remove after migration completes`)?

> **Suggested:** `it.skip("handles concurrent writes")` at line 44 has no explanation of why it is disabled. A future contributor has no way to know whether it is safe to re-enable. Could we add a reason and a ticket reference so the skip is trackable?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| TODO with no ticket or condition | Ask: "Could we add a ticket reference or a stated condition so this is traceable?" |
| FIXME with no explanation | Ask: "What is the workaround working around? A one-line explanation would let a future maintainer know when it's safe to remove." |
| Skipped test with no reason | Ask: "Why is this test skipped? A brief comment or ticket would make the skip intentional rather than mysterious." |
| `@ts-ignore` with no comment | Ask: "What error is being suppressed here? A comment citing the root cause would make this reviewable when the library updates." |

---

### `remove-clutter`

**Good:**

> **Suggested:** `item.lastChecked = Date.now()` at line 9 is after `return { skipped: true }` and can never execute. Could we remove it to avoid misleading future readers about what this branch does?

> **Suggested:** The three commented-out lines at lines 12–14 (`// const result = legacyProcess(data)`) have no explanation of why they are preserved. They create the impression of an alternative path. If this is safe to delete, could we remove it and let version control preserve it?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Statement after unconditional `return`/`throw` | Assert: "`item.lastChecked = ...` at line N is unreachable — the `return` on line M always exits first." |
| Commented-out code with no explanation | Ask: "Is the commented-out block at lines N–M still needed? If not, version control preserves it and we can delete it." |
| Comment restating the code | Ask: "Does `// increment i` add anything beyond what `i++` already says? Removing it would reduce the reading noise." |
| Empty `catch` with a misleading comment | Ask: "The `catch` block says `// handled elsewhere` but there is no handler upstream — should this at least log or re-throw?" |

---

### `long-method`

**Good:**

> **Suggested:** `submitOrder` at line 8 validates the input, calculates the price, persists the order, and sends a confirmation email — all inline. Each step is a named concept and a natural test boundary. Could `validateOrderInput`, `calculateOrderTotal`, `persistOrder`, and `sendConfirmation` be extracted so each can be tested and changed independently?

> **Suggested:** `handleEvent` at line 22 dispatches on `event.type` with `if`/`else if` branches that each contain 15–20 lines of logic. Each branch is effectively a separate handler. Could `handleOrderPlaced`, `handleOrderCancelled`, and `handlePaymentFailed` replace the branches so `handleEvent` becomes a router?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Function does validate + transform + persist + notify inline | Ask: "Could each phase (`validateInput`, `calculateTotal`, `persist`, `notify`) extract to a named function so each is independently testable?" |
| Long sequential steps with little shared state | Ask: "The steps here — fetch, enrich, aggregate, format — share almost no intermediate state. Could each become a named helper so the data flow is visible at the orchestration level?" |
| `if`/`else` dispatcher with substantial branch logic | Ask: "Each branch in this dispatcher is 15–20 lines. Could the branches become named handlers so `handleEvent` is purely routing?" |
| Test covering multiple unrelated scenarios | Ask: "This test exercises three independent scenarios. Could they become separate `it` blocks so each fails independently?" |

---

### `data-class`

**Good:**

> **Suggested:** `Order` at line 8 has six fields and a constructor but no methods. `getDiscountRate`, `isEligibleForRefund`, and `formatSummary` in `order-utils.ts` each read three or more `Order` fields. Could these move to `Order` as methods so the data and its operations are co-located?

> **Suggested:** `Address` at line 12 exposes only getters and setters with no computed behavior. `formatAddress`, `isInternational`, and `validate` in `address-helpers.ts` are entirely derived from `Address` fields. Is there a reason these live outside the class, or is this an opportunity to move them in?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Class has fields + constructor, behavior in external utils | Ask: "Could `getDiscountRate` and `isEligibleForRefund` move to `Order` as methods? They read only `Order` data and would be more discoverable there." |
| External function reads 3+ fields from one class | Ask: "Does `formatInvoiceLine` belong on `Order`? It reads `order.taxRate`, `order.discountCode`, and `order.discountAmount` while using no state of its own." |
| Class with only getters/setters, behavior elsewhere | Ask: "Are `format` and `validate` intentionally external to `Address`, or is this a data class whose behavior has drifted out?" |

---

### `misleading-name`

**Good:**

> **Suggested:** `findExpiredSessions` at line 22 also calls `db.sessions.deleteMany` before returning. Callers who treat it as a safe read operation — in tests, in a cron health check, in a dry-run mode — will unknowingly delete sessions. Could the deletion move to a separate `purgeExpiredSessions` function, or could the name reflect both operations?

> **Suggested:** `timeout` at line 8 is passed to `setTimeout(flush, timeout)`. `setTimeout` expects milliseconds; if the caller assumed seconds, the flush fires 1000× sooner than intended. Could this be renamed `timeoutMs` to make the unit unambiguous at every call site?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| `get*` / `find*` function with a visible delete or insert in the body | Assert: "`findExpiredSessions` deletes rows before returning — callers who treat it as a read operation will unknowingly destroy data." |
| Boolean named for its inverse (`isDisabled = true` means enabled) | Assert: "`isDisabled` is assigned `true` to enable the feature — the name means the opposite of the value." |
| Unit-sensitive identifier with no unit suffix | Ask: "Is `timeout` in milliseconds here? `setTimeout` expects ms — renaming to `timeoutMs` would prevent a silent magnitude error if the caller uses seconds." |
| Function name announces one concern, body does several | Ask: "Does `saveUser` also send a welcome email and push analytics? If so, could the additional behavior move to the call site or be reflected in the name?" |

---

### `complex-condition`

**Good:**

> **Suggested:** `if (!isNotReady)` at line 14 requires cancelling two negations to read as "if ready". Could `isNotReady` be renamed `isReady` so the guard becomes `if (isReady)`?

> **Suggested:** The condition at line 31 has six terms — `user.role`, `!user.isBanned`, `user.emailVerifiedAt`, `!isSessionExpired(user)`, `featureFlags.newDashboard`, and `user.agreedToTerms`. Could this extract to `canAccessDashboard(user, featureFlags)` so the call site is a single readable predicate and the logic can be tested in isolation?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Double negative (`!isNotReady`, `!isInactive`) | Ask: "Could `isNotReady` be renamed `isReady` so the guard reads `if (isReady)` rather than requiring two negations?" |
| Four or more terms inline | Ask: "Could these N conditions extract to `isEligible(...)` so the branch expresses one concept at the call site?" |
| Mixed `&&`/`||` without parentheses | Assert: "`a || b && c` evaluates as `a || (b && c)` — explicit parentheses would prevent a future reader from misreading the grouping." |
| `!(a || b)` without distributing the negation | Ask: "Could `!(isAdmin || isModerator)` be written `!isAdmin && !isModerator` to avoid the De Morgan transformation?" |

---

## Examples — bad (all passes)

> ❌ "This might be null." — vague, no location, no action.

> ❌ "Add error handling." — no rationale, no severity.

> ❌ "This condition looks wrong." — vague, no expression named, no failure mode.

> ❌ "**Blocking:** This is broken." — no explanation, no actionable fix.

> ❌ "**Suggested:** Why didn't you handle this?" — accusatory tone. Comment on the code, not the person.