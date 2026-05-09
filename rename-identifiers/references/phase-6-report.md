# Phase 6 — Report

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