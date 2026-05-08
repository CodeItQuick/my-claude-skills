---
name: rename-identifiers
description: Rename poorly named variables, parameters, or identifiers across both test and production code. Triggers on "rename variables across the codebase", "fix names in production code", "rename identifiers everywhere", "bad variable names in source", or "rename across tests and source".
---

# Rename Identifiers

Hunt down the worst-named identifiers across test and production code and rename them everywhere they appear.

## Core Principle

An identifier's name is its contract. If a reader must trace the value through multiple call sites to understand what it holds, the name is wrong — whether it lives in a test or in production.

## Phase 1 — Scope and Read

1. Identify the target scope: a single file, a module directory, or the full codebase. If the user doesn't specify, default to the full codebase.
2. Read every file in scope: source files, test files, type definition files, and index/barrel files.
3. Build a list of every identifier: `const`/`let`/`var` declarations, function parameters, callback arguments, destructured names, class fields, and exported names.
4. Note what each one actually holds — not just its declared type, but its domain meaning in context.

## Phase 1b — Identify the Domain

Before scoring any name, establish the domain vocabulary the codebase uses. Do this by:

1. Reading module names, exported function names, class names, and `describe`/`it` strings in test files.
2. Extracting the recurring nouns and verbs — these are the domain terms. Examples: a billing system uses *invoice*, *ledger*, *charge*, *refund*, *payment*; a chat app uses *message*, *thread*, *channel*, *participant*, *reaction*.
3. Writing down the domain term list. Every replacement name must be drawn from or composed of these terms. If a name you're considering isn't derivable from this vocabulary, it's the wrong name.

If the domain is ambiguous (a utility module, a generic adapter), use the closest enclosing product concept visible in the file path or package name.

## Phase 2 — Score for Badness

Label every candidate identifier with one of four severity levels:

| Label        | Examples                                                                                            | Why bad                               |
|--------------|-----------------------------------------------------------------------------------------------------|---------------------------------------|
| **CRITICAL** | `data`, `result`, `res`, `obj`, `temp`, `val`, `x`, `a`, `b`, `cb`, `fn`, `thing`, `stuff`, `info` | Zero meaning — tells reader nothing   |
| **CRITICAL** | Single-letter params outside short loops: `e`, `v`, `s`, `n`                                       | Opaque at every call site             |
| **HIGH**     | Name implies wrong type or domain — `userList` holds a count, `isValid` holds a string              | Actively misleading                   |
| **HIGH**     | Over-abbreviated: `usr`, `mgr`, `svc`, `prc`, `cfg`, `ctx` when domain is clear                    | Forces reader to decode               |
| **MEDIUM**   | `expected`, `actual`, `output`, `input` with no domain qualifier                                    | Structural words without meaning      |
| **MEDIUM**   | Numbered suffixes: `result1`, `result2`, `action1`                                                  | Means you didn't know what to call it |
| **LOW**      | Names that are slightly generic but not actively confusing in context                               | Minor improvement only                |

**Skip entirely (do not label):** loop counters (`i`, `j`, `k`), universally understood abbreviations (`id`, `url`, `html`, `json`, `err`), and names that are genuinely clear in context.

## Phase 3 — Threshold: MEDIUM, HIGH, and CRITICAL

**Rename every identifier labeled CRITICAL, HIGH, or MEDIUM. Skip LOW entirely.**

Do not apply a count limit — if there are 20 CRITICAL identifiers, rename all 20. The label is the filter, not file size or gut feeling.

**Production code gets stricter scrutiny than tests.** An identifier in production that forces readers to trace call chains to understand its value is a higher-severity problem than the equivalent in a test, because it affects every future maintainer of the system. When in doubt, bias toward CRITICAL/HIGH for production identifiers.

## Phase 4 — Choose Good Replacements

All replacements must use the domain vocabulary identified in Phase 1b. A name that is structurally correct but uses terms foreign to the domain is still a bad name.

Good replacements follow these rules:

- **Variables holding domain values:** use a noun from the domain term list. `data` → `invoiceLineItems`, `result` → `chargeResult`, `res` → `paymentResponse`.
- **Boolean variables:** prefix with `is`, `has`, `should`, `can`, then a domain term. `valid` → `isValidCharge`, `flag` → `hasOpenInvoice`.
- **Callback parameters:** name what the callback receives using a domain noun. `.map(x => ...)` → `.map(invoice => ...)`, `.forEach(e => ...)` → `.forEach(participant => ...)`.
- **Function parameters in production code:** name the role the value plays at the call site, not the internal implementation. `fn` → `onPaymentComplete`, `cb` → `onThreadClose`.
- **Test setup values:** name the role in the test with a domain term. `data` holding a stubbed API response → `stubbedInvoiceResponse`. `obj` holding a Redux store → `testStore`.
- **"Expected" / "actual" pairs in tests:** qualify with a domain concept. `expected` → `expectedChargeTotal`, `actual` → `actualChargeTotal`.

**Domain-consistency check:** before finalising a replacement, ask — "Would a developer who knows this domain immediately understand what this variable holds?" If the answer requires knowing the implementation internals, the name is still wrong.

**Cross-context consistency:** if the same logical value flows from production code into a test (e.g., a return value assigned to a variable in both), the names should be the same or compositionally related. Don't rename them to unrelated terms.

## Phase 5 — Execute

For each rename:

1. **Grep across the entire codebase** for all occurrences of the identifier before editing — source files, test files, type files, and barrel/index files. Partial renames are worse than none.
2. Rename the identifier in every file where it appears: production source, tests, and any re-export files.
3. Use `Edit` with `replace_all: true` for identifiers that appear multiple times in a file.
4. Rename one identifier at a time — don't batch multiple renames in one edit if it makes the diff unreadable.
5. Prefer word-boundary grep patterns (e.g., `\bidentifier\b`) to avoid spurious hits inside longer names, strings, or comments.
6. After all renames, re-read the changed sections in every affected file to confirm no occurrence was missed and no accidental collision was introduced (e.g., renaming `res` to `response` when `response` already exists in scope).
7. Check that renamed exports still match their import sites. If a public API name changes, update every consumer.
8. **If a class or module is renamed, rename its file too.** When a class name or the module's primary export changes, the filename must match. Rename the file using the shell (`mv` / `Rename-Item`), then update every `import` path across the codebase that referenced the old filename. Grep for the old filename stem (without extension) to find all consumers.

## Phase 6 — Report

After all renames, give a summary grouped by severity:

```
CRITICAL
  data          → invoiceLineItems   (held array of line items, not generic data)
  cb            → onPaymentComplete  (callback invoked after payment settles)

HIGH
  usr           → billingUser        (over-abbreviated; domain term is clear)
  isValid       → hasValidCharge     (was a string, not a boolean)

Files changed: src/billing.ts, src/billing.test.ts, src/index.ts
```

One line per rename within each group. No prose. If you skipped a suspicious name, note it in one line at the end with the reason.

## What NOT to Do

- **Don't rename everything.** Targeted rename of CRITICAL, HIGH, and MEDIUM identifiers only.
- **Don't change logic.** Rename only. No restructuring, no extracting, no "while I'm here" fixes.
- **Don't rename a production export without updating every consumer.** A broken import is worse than a bad name.
- **Don't rename a class/module without renaming the file.** Renaming the identifier but leaving the old filename creates a mismatch that confuses every future reader navigating by filename.
- **Don't apply rules robotically.** `err` in a `.catch(err => ...)` is fine. `e` in `.catch(e => ...)` is not. Use judgment.
- **Don't rename test `describe`/`it` strings.** Those are documentation strings, not identifiers.
- **Don't let test and production names diverge.** If a value is the same concept in both contexts, its name should be consistent across both.