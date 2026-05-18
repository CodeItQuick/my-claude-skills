# Detection Patterns — Long Parameter List

Patterns where a function accepts so many positional parameters that call sites become hard to read, parameters are easy to transpose, and adding new parameters breaks all callers. Each pattern is a *candidate*, not a finding — apply the evidence rules in `skill.md` and the suppression rules in `../maintainability/suppression-rules.md` before reporting.

## 1. Five or more positional parameters

```ts
function createInvoice(
  userId: string,
  orderId: string,
  amount: number,
  currency: string,
  dueDate: Date
) { ... }
```

Five parameters is the threshold. Beyond four, callers must look up the order every time, and the signature is one parameter away from becoming unreadable.

## 2. Adjacent parameters of the same type

```ts
function sendEmail(to: string, from: string, subject: string, body: string, replyTo: string) { ... }
```

When two or more adjacent parameters share the same type, the compiler cannot catch transpositions. `sendEmail(from, to, ...)` is a silent bug.

## 3. Optional parameters extending an already-long list

```ts
function fetchReport(
  userId: string,
  startDate: Date,
  endDate: Date,
  format?: string,
  locale?: string,
  timezone?: string
) { ... }
```

Optional parameters at the tail of a long list force callers to pass `undefined` placeholders or use argument counting to reach the parameter they want.

## 4. Parameters that form a natural domain object

```ts
function registerUser(
  firstName: string,
  lastName: string,
  email: string,
  role: string,
  departmentId: string
) { ... }
```

`firstName`, `lastName`, `email`, `role`, and `departmentId` all describe a user. An options object (`RegisterUserRequest`) groups them under a name, makes each field self-documenting at the call site, and allows new fields to be added without changing the function signature.

## 5. Boolean or enum flags mixed into a long list

```ts
function exportData(
  datasetId: string,
  startDate: Date,
  endDate: Date,
  includeHeaders: boolean,
  compress: boolean
) { ... }
```

Boolean flags compounding a long parameter list create two problems at once: the list is long, and the booleans are positional with no names at the call site (`exportData(id, start, end, true, false)` is unreadable).

## 6. Call sites use positional literals with no context

```ts
createInvoice("usr-123", "ord-456", 99.99, "USD", dueDate);
```

When call sites pass raw literals in a sequence, the reader cannot tell which value maps to which parameter without looking up the function signature. Named fields in an options object eliminate this lookup.

## 7. Parameters with defaults scattered through the list

```ts
function buildQuery(
  table: string,
  conditions: Condition[],
  orderBy: string = "id",
  limit: number = 100,
  offset: number = 0,
  explain: boolean = false
) { ... }
```

Defaults scattered through a long list mean callers who want only the last default must pass all preceding arguments explicitly. This is the strongest signal that an options object is the right shape.

---

## Patterns to **not** flag

- **Four or fewer parameters** — below the threshold; flag only when there is also a transposition or grouping signal
- **Framework-imposed signatures** — event handlers, middleware, lifecycle hooks, and test framework callbacks where the signature is contractual
- **Mathematical or algorithmic functions** — `clamp(value, min, max)`, `lerp(a, b, t)` — short, well-ordered, universally understood
- **Constructor of an options object itself** — a class whose whole purpose is to hold these values; the constructor is the right place for them
- **All parameters are distinct types with no grouping** — `setTimeout(fn: () => void, delay: number)` — two parameters, different types, no sensible group