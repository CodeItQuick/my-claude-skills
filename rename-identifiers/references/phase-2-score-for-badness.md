# Phase 2 — Classify Each Identifier

Apply the taxonomy below to every candidate identifier. Each category has a single root cause and a single fix rule — classification and fix strategy are inseparable. Assign the **first** category whose detection rule matches, evaluated in priority order: LIE → CHIMERA → CIPHER → SERIES → FRAGMENT → VOID.

**Scope:** every `const`/`let`/`var` declaration, function parameter, callback argument, destructured name, class field, class name, method name, and exported name. Existing class and function names are not exempt — they are often the worst offenders.

---

## The Six Categories

### VOID — *No semantic content* `[CRITICAL]`

**Root cause:** The name carries zero information. Expanding or reading it tells the reader nothing about what the identifier represents.

**Detection:** name ∈ canonical void set: `data`, `result`, `res`, `obj`, `temp`, `val`, `x`, `a`, `b`, `cb`, `fn`, `thing`, `stuff`, `info`, `item`, `value`, `response` (unqualified); OR name is a single letter outside a loop counter; OR the expansion of the name in any domain still means nothing.

**Expansion test:** if a CIPHER candidate's expansion is itself void (`cb` → `callback`, `fn` → `function`), classify it as VOID, not CIPHER.

**Fix rule:** identify what the identifier actually holds; replace with a domain noun that names that thing directly.

---

### LIE — *False semantic content* `[CRITICAL]`

**Root cause:** The name makes a specific, verifiable claim about type, shape, or domain role that is factually wrong. The reader is actively misled.

**Detection:** any of the following mismatches between name and value:
- Boolean prefix (`is`, `has`, `should`, `can`) on a non-boolean value
- Collection suffix (`List`, `Array`, `Set`, `Map`) on a scalar or non-collection
- Domain-specific term applied to a different domain concept (e.g., `userList` holds a count, `invoiceId` holds a full object)

**Fix rule:** identify the actual type, cardinality, and domain role of the identifier; replace with a name that matches all three.

---

### CHIMERA — *Incoherent term combination* `[HIGH]`

**Root cause:** The name is assembled from multiple valid domain terms, but their concatenation does not map to any single coherent concept in the domain model. Sounds meaningful; forces the reader to open the implementation.

**Detection:** name has 3+ PascalCase segments, OR two domain terms are concatenated without a recognized relationship pattern (e.g., `CardHandSuit`, `UserDataManager`, `PaymentProcessingHelper`). Confirm: read the implementation — if the code models a single coherent concept with a simpler name, the identifier is a CHIMERA.

**Fix rule:** read the implementation to identify the one real domain concept being modeled; name the concept directly, discarding the old constituent terms entirely.

---

### CIPHER — *Correct content, encoded* `[HIGH]`

**Root cause:** The name abbreviates a term where spelling it out in full produces the complete, correct name — no domain inference required. The meaning is present but locked.

**Detection:** name matches a known abbreviation pattern where expansion yields a complete, meaningful name on its own: `usr`→`user`, `mgr`→`manager`, `svc`→`service`, `cfg`→`config`, `prc`→`process`, `ctx`→`context`, `btn`→`button`, `idx`→`index`. If expansion still yields a void or fragment, classify as VOID or FRAGMENT instead.

**Fix rule:** spell out the abbreviation in full.

---

### FRAGMENT — *Structural role without domain qualification* `[MEDIUM]`

**Root cause:** The name correctly names a structural role or relationship but omits the domain concept it belongs to. The reader knows how the value is used, not what it is.

**Detection:** name ∈ structural role set — `expected`, `actual`, `output`, `input`, `handler`, `processor`, `manager`, `helper`, `wrapper`, `request`, `payload` — with no domain noun attached.

**Fix rule:** qualify the structural word by prepending or appending the domain noun it belongs to (`expected` → `expectedChargeTotal`, `handler` → `paymentHandler`).

---

### SERIES — *Ordinal encoding instead of semantic content* `[MEDIUM]`

**Root cause:** The name encodes position rather than the identifier's distinct conceptual role. Multiple identifiers share a base name differentiated only by number, meaning the author did not know what to call each one.

**Detection:** name matches `<base><digit>+` (e.g., `result1`, `result2`, `action1`) AND at least one sibling exists sharing the same base.

**Fix rule:** for each numbered identifier, determine what makes it conceptually distinct from its siblings; name that distinction directly.

---

## Severity Summary

| Category | Severity | Root cause |
|----------|----------|------------|
| VOID     | CRITICAL | No information |
| LIE      | CRITICAL | False information |
| CHIMERA  | HIGH     | Incoherent information |
| CIPHER   | HIGH     | Encoded information |
| FRAGMENT | MEDIUM   | Incomplete information |
| SERIES   | MEDIUM   | Positional, not conceptual |

---

## Skip Entirely

Do not classify: loop counters (`i`, `j`, `k`), universally understood abbreviations (`id`, `url`, `html`, `json`, `err`), and names that are genuinely unambiguous in context. `err` in `.catch(err => ...)` is fine. `e` in `.catch(e => ...)` is VOID.

**Scoring inside a class or function:** score each identifier by what it actually does or holds, independent of the enclosing scope's name. A mis-named class does not legitimize mis-named fields.