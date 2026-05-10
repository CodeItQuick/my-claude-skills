# Rename Identifiers

Analyze the code below. Score every identifier for naming quality and output only the scored list. Do not rewrite the code.

## Phase 1 — Read and Inventory

The scope is the code in `{{code}}`. Work only from that code.

Read through the entire code and note every identifier: `const`/`let`/`var` declarations, function parameters, callback arguments, destructured names, class fields, class names, method names, and exported names. Note what each one actually holds — not just its declared type, but its domain meaning in context.

## Phase 1b — Identify the Domain

Before scoring, establish the domain vocabulary:

1. Read `describe`/`it` strings, comments, and method implementations — what do they compute or produce?
2. Extract recurring nouns and verbs — these are the domain terms (e.g. a poker app uses *startingHand*, *holeCards*, *suit*, *rank*).
3. Every replacement name must be drawn from these terms.

**Existing identifiers are suspects, not authorities.** A class named `CardHandSuit` does not establish that "CardHandSuit" is a real domain concept — read the implementation to determine what it actually models.

**Concatenated noun-phrases are a red flag.** `CardHandSuit`, `UserDataManager` — treat as HIGH severity candidates regardless of whether each word is a valid domain term.

## Phase 2 — Score Every Identifier

Label each identifier using this table:

| Label        | Examples                                                                                                              | Why bad                               |
|--------------|-----------------------------------------------------------------------------------------------------------------------|---------------------------------------|
| **CRITICAL** | `data`, `result`, `res`, `obj`, `temp`, `val`, `x`, `a`, `b`, `cb`, `fn`, `thing`, `stuff`, `info`                    | Zero meaning — tells reader nothing   |
| **CRITICAL** | Params named after their type instead of their domain role: `applyDiscount(fn)` → `applyDiscount(discountCalculator)` | Names the mechanism, not the concept  |
| **CRITICAL** | Single-letter params outside short loops: `e`, `v`, `s`, `n`                                                          | Opaque at every call site             |
| **HIGH**     | Name implies wrong type or domain — `userList` holds a count, `isValid` holds a string                                | Actively misleading                   |
| **HIGH**     | O  ver-abbreviated: `usr`, `mgr`, `svc`, `prc`, `cfg`, `ctx` when domain is clear                                     | Forces reader to decode               |
| **HIGH**     | Abbreviated callback params that truncate a domain noun: `ing` → `ingredient`, `prod` → `product`                     | Use the full domain term              |
| **HIGH**     | Concatenated noun-phrases with no real domain concept — `CardHandSuit`, `UserDataManager`                             | Models no recognisable concept        |
| **MEDIUM**   | `expected`, `actual`, `output`, `input` with no domain qualifier                                                      | Structural words without meaning      |
| **MEDIUM**   | Numbered suffixes: `result1`, `result2`, `action1`                                                                    | Means you didn't know what to call it |
| **LOW**      | Slightly generic but not actively confusing in context                                                                | Minor improvement only                |

Score each identifier by what it actually holds or does — do not inherit the parent class or function name as ground truth.

**Skip entirely:** loop counters (`i`, `j`, `k`), universally understood abbreviations (`id`, `url`, `html`, `json`, `err`), and names that are genuinely clear in context.

## Output

Output only this — no prose, no rewritten code:

```
CRITICAL
  <identifier>  →  <suggested rename>  (<one-line reason>)

HIGH
  <identifier>  →  <suggested rename>  (<one-line reason>)

MEDIUM
  ...

LOW
  ...

SKIPPED
  <identifier>  (<one-line reason why it was not labeled>)
```

Omit any severity group that has no entries. Suggested rename must use domain vocabulary from Phase 1b.

---

{{code}}