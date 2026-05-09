# Phase 2 — Score for Badness

Label every candidate identifier with one of four severity levels. **Score every identifier in scope: variables, parameters, callback arguments, class names, method names, and module names.** Existing class and function names are not exempt — they are often the worst offenders.

| Label        | Examples                                                                                            | Why bad                               |
|--------------|-----------------------------------------------------------------------------------------------------|---------------------------------------|
| **CRITICAL** | `data`, `result`, `res`, `obj`, `temp`, `val`, `x`, `a`, `b`, `cb`, `fn`, `thing`, `stuff`, `info` | Zero meaning — tells reader nothing   |
| **CRITICAL** | Single-letter params outside short loops: `e`, `v`, `s`, `n`                                       | Opaque at every call site             |
| **HIGH**     | Name implies wrong type or domain — `userList` holds a count, `isValid` holds a string              | Actively misleading                   |
| **HIGH**     | Over-abbreviated: `usr`, `mgr`, `svc`, `prc`, `cfg`, `ctx` when domain is clear                    | Forces reader to decode               |
| **HIGH**     | Concatenated noun-phrases that don't map to a real domain concept — `CardHandSuit`, `UserDataManager` | Sounds domain-flavoured but models no recognisable concept; forces reader to open the implementation to understand what it represents |
| **MEDIUM**   | `expected`, `actual`, `output`, `input` with no domain qualifier                                    | Structural words without meaning      |
| **MEDIUM**   | Numbered suffixes: `result1`, `result2`, `action1`                                                  | Means you didn't know what to call it |
| **LOW**      | Names that are slightly generic but not actively confusing in context                               | Minor improvement only                |

**Scoring identifiers inside a class or function:** do not inherit the parent name as ground truth. If the enclosing class is mis-named, the names of its methods and fields may carry that mis-naming into their own identifiers. Score each identifier by what it actually does or holds, independent of what the enclosing scope calls itself.

**Skip entirely (do not label):** loop counters (`i`, `j`, `k`), universally understood abbreviations (`id`, `url`, `html`, `json`, `err`), and names that are genuinely clear in context.