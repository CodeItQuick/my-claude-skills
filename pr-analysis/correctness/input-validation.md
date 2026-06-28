# Detection Patterns — Input Validation

Patterns where inputs from external sources — user input, API responses, environment variables, parsed data — are used without adequate validation. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the input-validation suppression rules in `../shared/suppression-rules.md` before reporting.

This pass is distinct from `null-access`, which covers nullable dereferences specifically. This pass covers inputs that are non-null but still unsafe: out-of-range numbers, unsanitized strings, malformed parsed values, and coerced types with surprising results.

## 1. Numeric input used without bounds check

```ts
function getPage(pageNumber: number): Item[] {
  const offset = pageNumber * PAGE_SIZE;
  return db.items.findMany({ skip: offset, take: PAGE_SIZE });
}
```

`pageNumber` comes from a query parameter or request body. A negative value produces a negative offset; a very large value produces an integer overflow in some databases. No check ensures `pageNumber >= 0` or is within a reasonable range before the multiplication is used.

## 2. Array index from external input without length guard

```ts
const index = parseInt(req.params.index);
return items[index];
```

`parseInt` on user input may produce `NaN` (which evaluates to `undefined` on array access), a negative index, or an index beyond the array's length. All three produce `undefined` without throwing. If the result is then used as a non-optional value, a silent error follows.

## 3. `parseInt` / `parseFloat` result used without NaN guard

```ts
const timeout = parseInt(process.env.TIMEOUT_MS);
await delay(timeout);
```

`parseInt` returns `NaN` when the string is not a valid integer. `NaN` propagates silently through arithmetic — `delay(NaN)` may resolve immediately, wait forever, or throw depending on the implementation. There is no `isNaN` or `Number.isFinite` check before use.

## 4. Raw user input interpolated into a sensitive operation

```ts
const filePath = path.join(baseDir, req.params.filename);
const contents = fs.readFileSync(filePath, "utf8");
```

Without checking that `req.params.filename` does not contain `..` or an absolute path prefix, the join produces a path outside `baseDir`. The file read then operates on attacker-controlled paths.

## 5. External string parsed as a number via implicit coercion

```ts
const price = req.body.price * 1.1;  // "100abc" * 1.1 === NaN
```

The `*` operator coerces the string, but a non-numeric string produces `NaN` and `"100abc"` produces `NaN` rather than `110`. The result flows into downstream calculations silently.

## 6. Unvalidated enum / union value from external source

```ts
type Status = "active" | "inactive" | "pending";

function setStatus(userId: string, status: Status) {
  db.users.update({ where: { id: userId }, data: { status } });
}

// called with:
setStatus(id, req.body.status as Status);
```

The `as Status` assertion silences the type checker without validating the value at runtime. If `req.body.status` is `"deleted"` or any other string, it writes an invalid value to the database.

## 7. Missing format validation before parsing structured input

```ts
const date = new Date(req.body.birthdate);
if (date.getFullYear() < 1900) throw new Error("Invalid year");
```

`new Date("not-a-date")` produces an `Invalid Date` object — not an exception. `Invalid Date.getFullYear()` returns `NaN`, which fails the `< 1900` check and passes silently. The downstream consumer receives an invalid `Date` instance.

---

## Evidence required

Gather **at least two** before reporting:

1. **Source evidence** — the value originates from an external boundary: `req.body`, `req.query`, `req.params`, `process.env`, `JSON.parse`, a file read, or a third-party API response.
2. **Usage evidence** — the unvalidated value is used directly in a sensitive operation: arithmetic, array indexing, path construction, database query, or type assertion.
3. **Missing check evidence** — no bounds check, `isNaN`, `Number.isFinite`, format check, or schema validation appears between the source and the usage.
4. **Impact evidence** — a concrete description of what goes wrong: negative offset, path traversal, NaN propagation, SQL injection surface, or invalid value persisted to storage.

---

## Patterns to **not** flag

- **Validated at a single entry point** — if validation happens before the value enters the system (e.g., middleware, schema validation, `zod`/`joi`/`yup` parse), downstream uses do not need repeated checks.
- **Internally produced values** — a value created by the function itself or by a trusted internal constructor is not an external input. Do not flag `array.length` as needing a bounds check.
- **TypeScript type guards already enforce the constraint** — if the type system has narrowed the value to a safe range (e.g., a discriminated union), the runtime check is redundant.
- **Deliberate pass-through of unvalidated data with documentation** — a proxy or forwarding layer that explicitly notes it does not validate.
- **Test code** — test inputs are constructed by the author and do not represent external data.

---

## Comment examples

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