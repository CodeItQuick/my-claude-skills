---
name: rename-test-variables
description: Use when asked to rename poorly named variables, parameters, or identifiers in a test file. Triggers on "rename variables", "fix names", "bad variable names", "improve naming in tests", or "rename params in test".
---

# Rename Test Variables

Hunt down the worst-named identifiers in a test file and rename them to something that communicates intent clearly.

## Core Principle

A test's variable names are documentation. If a reader can't tell what a value represents without reading the body that produces it, the name is wrong.

## Phase 1 — Read and Collect

1. Read the full test file.
2. Build a mental list of every identifier: `const`/`let`/`var` declarations, function parameters, callback arguments, destructured names.
3. Note what each one actually holds — not just its declared type, but its domain meaning in context.

## Phase 2 — Score for Badness

Label every candidate identifier with one of four severity levels:

| Label        | Examples                                                                                          | Why bad                             |
|--------------|---------------------------------------------------------------------------------------------------|-------------------------------------|
| **CRITICAL** | `data`, `result`, `res`, `obj`, `temp`, `val`, `x`, `a`, `b`, `cb`, `fn`, `thing`, `stuff`, `info` | Zero meaning — tells reader nothing |
| **CRITICAL** | Single-letter params outside short loops: `e`, `v`, `s`, `n`                                     | Opaque at every call site           |
| **HIGH**     | Name implies wrong type or domain — `userList` holds a count, `isValid` holds a string            | Actively misleading                 |
| **HIGH**     | Over-abbreviated: `usr`, `mgr`, `svc`, `prc`, `cfg`, `ctx` when domain is clear                  | Forces reader to decode             |
| **MEDIUM**   | `expected`, `actual`, `output`, `input` with no domain qualifier                                  | Structural words without meaning    |
| **MEDIUM**   | Numbered suffixes: `result1`, `result2`, `action1`                                                | Means you didn't know what to call it |
| **LOW**      | Names that are slightly generic but not actively confusing in context                             | Minor improvement only              |

**Skip entirely (do not label):** loop counters (`i`, `j`, `k`), universally understood abbreviations (`id`, `url`, `html`, `json`, `err`), and names that are genuinely clear in context.

## Phase 3 — Threshold: HIGH and CRITICAL Only

**Rename every identifier labeled CRITICAL or HIGH. Skip everything labeled MEDIUM or LOW entirely.**

Do not apply a count limit — if there are 20 CRITICAL identifiers, rename all 20. Do not rename a MEDIUM just because there are few CRITICAL/HIGH hits. The label is the filter, not file size or gut feeling.

## Phase 4 — Choose Good Replacements

Good replacements follow these rules:

- **Variables holding domain values:** use a noun that names the domain concept. `data` → `playerHands`, `result` → `rangeScore`, `res` → `apiResponse`.
- **Boolean variables:** prefix with `is`, `has`, `should`, `can`. `valid` → `isValidRange`, `flag` → `hasDealtCards`.
- **Callback parameters:** name what the callback receives. `.map(x => ...)` → `.map(card => ...)`, `.forEach(e => ...)` → `.forEach(player => ...)`.
- **Test setup values:** name the role in the test. `data` holding a stubbed API response → `stubbedHandHistory`. `obj` holding a Redux store → `testStore`.
- **"Expected" / "actual" pairs:** qualify with the domain concept. `expected` → `expectedWinRate`, `actual` → `actualWinRate`.

## Phase 5 — Execute

For each rename:

1. **Grep for all occurrences** of the identifier — first in the target file, then across the whole codebase — before editing. Partial renames are worse than none.
2. If the identifier is exported or referenced in other files, rename it in every file that uses it. Use Grep with the identifier as the pattern to find all files, then edit each one.
3. Use `Edit` with `replace_all: true` for identifiers that appear multiple times in a file.
4. Rename one identifier at a time — don't batch multiple renames in one edit if it makes the diff unreadable.
5. After all renames, re-read the changed sections in every affected file to confirm no occurrence was missed and no accidental collision was introduced (e.g., renaming `res` to `response` when `response` already exists).
6. When renaming across files, prefer grepping for word-boundary matches (e.g., `\bidentifier\b`) to avoid spurious hits in unrelated strings or comments.

## Phase 6 — Report

After all renames, give a two-column summary:

```
Old name        → New name         (reason)
data            → dealerHands      (held array of dealer cards, not generic data)
result          → handRankResult   (output of rankHand(), not a generic result)
cb              → onRoundComplete  (callback invoked after round ends)
e               → handError        (error thrown when hand is invalid)
```

One line per rename. No prose. If you skipped a suspicious name, note it in one line at the end with the reason.

## What NOT to Do

- **Don't rename everything.** Targeted rename of the worst names, not a wholesale rewrite.
- **Don't change logic.** Rename only. No restructuring, no extracting, no "while I'm here" fixes.
- **Do rename across files when needed.** If the identifier is exported or imported elsewhere, find every file that uses it and rename it there too. A rename that leaves callers broken is worse than no rename.
- **Don't apply rules robotically.** `err` in a `.catch(err => ...)` is fine. `e` in `.catch(e => ...)` is not. Use judgment.
- **Don't rename test describe/it strings.** Those are documentation strings, not identifiers.
