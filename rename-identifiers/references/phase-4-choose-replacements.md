# Phase 4 — Choose Good Replacements

All replacements must use the domain vocabulary identified in Phase 1b. A name that is structurally correct but uses terms foreign to the domain is still a bad name.

Good replacements follow these rules:

- **Variables holding domain values:** use a noun from the domain term list. `data` → `invoiceLineItems`, `result` → `chargeResult`, `res` → `paymentResponse`.
- **Boolean variables:** prefix with `is`, `has`, `should`, `can`, then a domain term. `valid` → `isValidCharge`, `flag` → `hasOpenInvoice`.
- **Callback parameters:** name what the callback receives using a domain noun. `.map(x => ...)` → `.map(invoice => ...)`, `.forEach(e => ...)` → `.forEach(participant => ...)`.
- **Function parameters in production code:** name the role the value plays at the call site, not the internal implementation. `fn` → `onPaymentComplete`, `cb` → `onThreadClose`.
- **Test setup values:** name the role in the test with a domain term. `data` holding a stubbed API response → `stubbedInvoiceResponse`. `obj` holding a Redux store → `testStore`.
- **"Expected" / "actual" pairs in tests:** qualify with a domain concept. `expected` → `expectedChargeTotal`, `actual` → `actualChargeTotal`.

**Domain-consistency check:** before finalising a replacement, ask — "Would a developer who knows this domain immediately understand what this variable holds?" If the answer requires knowing the implementation internals, the name is still wrong.

**Class and module renames:** derive the replacement from what the class actually models in the domain — read the constructor, fields, and methods to determine the real concept. Do not compose the replacement from the terms already in the old name; those terms may themselves be wrong. A class named `CardHandSuit` that models a two-card starting hand should become `StartingHand`, not `HandSuitCard` or `SuitedCardHand`.

**Cross-context consistency:** if the same logical value flows from production code into a test (e.g., a return value assigned to a variable in both), the names should be the same or compositionally related. Don't rename them to unrelated terms.