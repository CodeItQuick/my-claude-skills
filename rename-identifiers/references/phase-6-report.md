# Phase 6 — Report

After all renames, produce a summary grouped by category (CRITICAL categories first, then HIGH, then MEDIUM):

```
VOID [CRITICAL]
  data          → invoiceLineItems     (held array of line items)
  cb            → onPaymentComplete    (callback invoked after payment settles)

LIE [CRITICAL]
  userList      → userCount            (held a count, not a collection)
  isValid       → validationMessage    (held a string, not a boolean)

CHIMERA [HIGH]
  CardHandSuit  → StartingHand         (modeled a two-card starting hand)

CIPHER [HIGH]
  usr           → user
  mgr           → manager

FRAGMENT [MEDIUM]
  expected      → expectedChargeTotal
  actual        → actualChargeTotal

SERIES [MEDIUM]
  result1       → chargeAttemptResult
  result2       → refundConfirmation

Files changed: src/billing.ts, src/billing.test.ts, src/index.ts
```

One line per rename within each group. No prose. If you skipped a suspicious name, note it at the end with the category you considered and the reason you rejected it.