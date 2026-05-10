# Phase 4 — Choose Good Replacements

The fix rule for each category is deterministic. Apply the rule for the category assigned in Phase 2. All replacements must draw from the domain vocabulary identified in Phase 1b.

---

## Fix Rules by Category

**VOID** — What does the identifier actually hold? Name that thing using a domain noun from the vocabulary list.
- `data` → `invoiceLineItems` (held an array of line items)
- `result` → `chargeResult` (held the outcome of a charge operation)
- `cb` → `onPaymentComplete` (void because expansion "callback" is itself void; named by what it is called when)

**LIE** — What does the identifier actually hold? Identify the true type, cardinality, and domain role; use all three.
- `userList` (holds a count) → `userCount`
- `isValid` (holds a string) → `validationMessage`
- `invoiceId` (holds a full object) → `invoice`

**CHIMERA** — Read the implementation. What single concept does the code model? Name that concept. Do not reuse the old constituent terms — they may themselves be wrong.
- `CardHandSuit` (models a two-card starting hand) → `StartingHand`
- `UserDataManager` (manages a session) → `SessionManager`
- `PaymentProcessingHelper` (formats a payment request) → `PaymentRequestFormatter`

**CIPHER** — Spell out the abbreviation.
- `usr` → `user`
- `mgr` → `manager`
- `svc` → `service`
- `cfg` → `config`

**FRAGMENT** — Prepend or append the domain noun that the structural word belongs to.
- `expected` → `expectedChargeTotal`
- `actual` → `actualChargeTotal`
- `handler` → `paymentHandler`
- `payload` → `webhookPayload`

**SERIES** — Identify what makes each numbered item conceptually distinct from its siblings; name the distinction.
- `result1` / `result2` (first is charge attempt, second is refund confirmation) → `chargeAttemptResult` / `refundConfirmation`
- `action1` / `action2` (first dispatches, second resets) → `dispatchAction` / `resetAction`

---

## Universal Constraints

**Boolean variables:** always prefix with `is`, `has`, `should`, or `can` followed by a domain term. A boolean fix that removes a false prefix (LIE) must also add the correct one.

**Callback parameters:** name what the callback receives, not that it is a callback. `.map(x => ...)` → `.map(invoice => ...)`.

**Cross-context consistency:** if the same logical value flows from production code into a test, its name must be the same or compositionally related in both. Do not rename them to unrelated terms.

**Domain-consistency check:** before finalising any replacement, ask — "Would a developer who knows this domain immediately understand what this variable holds?" If the answer requires knowing the implementation, the name is still wrong.

**Class and module renames (CHIMERA/VOID on class names):** derive the replacement from what the class actually models — read the constructor, fields, and methods. Do not compose the replacement from terms already in the old name.