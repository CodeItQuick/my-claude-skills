# Each behavior has one owning layer

**Rule:** Put all the cases for a behavior in the lowest layer that can
observe it. The layers, from lowest to highest, are unit, service or API,
component or UI, and browser end-to-end. The number of tests at each layer
follows from where the behaviors live. Do not aim for a shape.

**Apply it:** Which is the lowest layer that can call the code and read the
result? That layer gets every case. `wiring-not-a-copy.md` says what the
layers above it add.

**Backed in code:** nothing yet. Which layer can observe a behavior is a
judgment about the code, not about the test text.

**Example:** order discounts.

- The unit tests own the discount rules: every threshold, and "no threshold
  means no discount".
- The service or API tests add one case. The unit tests cannot see whether the
  route sends `null` for an order with no discount rule.
- The component tests check only that the page draws "No discount" from the
  payload.
- The browser end-to-end tests add nothing. No browser-only fact is involved.

**Evidence:** No graded claim supports or refutes the rule. The ledger in
`evidence.md` grades the test shapes, and none of them passes:

- software_testing-44, folklore: "a suite must be mostly unit tests because
  the pyramid says so".
- software_testing-42, moderate: real suites do not follow the pyramid's
  proportions.
- software_testing-43, unsupported: component tests find more defects than
  end-to-end tests.

**Found by:** three gaps in one repository.

1. The unit layer owned a "no data means null" rule, and no route test
   checked the wiring.
2. The component tests owned a double-click guard, and the browser test ran
   the timing for one input style of two.
3. The unit tests of a validator repeated cases that its CLI tests already
   owned. They added no defect that the CLI cases missed.

This repository's instance is in `.claude/writing-tests/found-by.md`, where
that file exists.

**Why no script:** The cheapest proxy is a test title that appears in two
packages. It found 2 titles, both in the unit and the service layers. It
catches none of the three gaps above, so it was rejected.
