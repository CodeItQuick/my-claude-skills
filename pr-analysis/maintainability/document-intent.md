# Detection Patterns — Document Intent

Patterns where code requires a reader to look up, re-derive, or guess information that the author already knew — magic values, undocumented side effects, non-obvious algorithms, and workarounds with no stated rationale. Each pattern is a *candidate*, not a finding — apply the evidence rules below and the document-intent suppression rules in `../shared/suppression-rules.md` before reporting.

## 1. Magic numeric literal with no explanation

```ts
setTimeout(flush, 86400000);

const MAX = 2147483647;

if (status === 3) { ... }
```

A bare numeric literal that carries domain meaning but communicates nothing to a reader. `86400000` requires mental arithmetic to recognise as one day in milliseconds; `3` requires knowing the status encoding. A named constant documents the value; a comment documents the unit or origin.

## 2. Magic string literal used as a discriminant or key

```ts
event.type === "usr_act_deact"

headers["x-correlation-id"]

db.query("SELECT * FROM usr WHERE flg = 'D'")
```

An opaque string whose interpretation requires knowledge outside the code — an external protocol, a database schema, a legacy abbreviation. Unlike a URL or a log message, these strings are load-bearing identifiers whose meaning must be derivable from the code.

## 3. Side-effecting function with no documentation of the side effect

```ts
function getUser(id: string): User {
  auditLog.record("user-accessed", id);   // side effect not communicated
  return db.users.findById(id);
}

function calculateTotal(cart: Cart): number {
  cart.appliedDiscounts = [];             // mutates input silently
  return cart.items.reduce(...);
}
```

A function named as a query (`get`, `calculate`, `find`, `is`) that also performs a state change. Callers who read only the name and return type will be surprised. The side effect belongs in the name, the JSDoc, or an adjacent comment.

## 4. Non-obvious algorithm with no explanation of the approach

```ts
function compress(data: number[]): number[] {
  return data.reduce((acc, v, i) =>
    i % 2 === 0 ? [...acc, v ^ data[i + 1]] : acc, []);
}

const hash = (str: string) =>
  str.split("").reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0);
```

When an algorithm's correctness depends on a non-obvious mathematical property, a specific invariant, or a known technique, a reader must reconstruct the author's reasoning from scratch. A one-line comment naming the technique or explaining the invariant eliminates that cost.

## 5. Non-obvious workaround with no explanation

```ts
// workaround
(window as any).requestAnimationFrame = (window as any).requestAnimationFrame
  || (window as any).mozRequestAnimationFrame;

arr.sort().reverse();   // reverse needed because sort is unstable in V8 < 7.0
```

Code that is correct but surprising — the kind a future maintainer will "fix" and re-introduce the bug. The workaround itself is fine; the absence of a comment explaining what it works around is the problem.

## 6. Complex regex or bit operation with no description

```ts
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const aligned = (ptr + 7) & ~7;

const flags = (user.role << 4) | user.permissions;
```

A regex or bitwise expression that a reader cannot verify at a glance. The question is not whether it is correct but whether a future maintainer can confirm it is still correct after a requirement changes. A named constant for the regex and a comment for the bit manipulation remove the ambiguity.

---

## Evidence required

Gather **at least two** before reporting:

1. **Opacity evidence** — a literal value, identifier, or expression requires knowledge outside the code to interpret: a bare numeric literal with domain meaning, an abbreviated string key, a bit operation, or a complex regex.
2. **Derivation cost evidence** — a reader must perform arithmetic, look up a specification, or recall an idiom to confirm the value is correct; the derivation cost is not zero.
3. **Surprise risk evidence** — the code is correct but non-obvious enough that a future maintainer would plausibly "fix" it incorrectly: a workaround, a counterintuitive ordering, or a value whose unit is invisible.
4. **Absence evidence** — no adjacent comment, no named constant, and no surrounding context explains the non-obvious element.

---

## Patterns to **not** flag

- **Self-documenting names** — `ONE_DAY_MS = 86_400_000`, `MAX_INT_32 = 2_147_483_647`. When the constant's name communicates its meaning, a comment is redundant.
- **Well-known idioms** — `arr.length - 1` for the last index, `i++` in a loop counter, `x ?? defaultValue`. These are universally understood and need no explanation.
- **Simple one-liners whose purpose is obvious from context** — `return items.filter(x => x.active)` in a function called `getActiveItems` needs no comment.
- **Test code** — test function names serve as documentation; test bodies are expected to be direct.
- **Generated or scaffolded code** — migration files, protobuf stubs, code produced by a tool. The generator is responsible for documentation.
- **Comments already present** — do not flag code that already has an adjacent comment explaining the non-obvious element, even if the comment is brief.

---

## Comment examples

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