# A higher layer checks the wiring, not a copy of the cases

**Rule:** A layer above the owning layer adds a test only for a fact that the
owning layer cannot see. That fact is one of two kinds:

- **Wiring:** the layer calls the code below it and passes the result through.
  One case is usually enough.
- **A fact only that layer has:** an HTTP status, serialization, CSS, or
  browser timing.

**Apply it:** If you delete this test, which defect does no other test catch?
If the answer is none, the test is a copy. If the answer is "the wiring", keep
one case.

**Backed in code:** three checks. None of them is a script yet.

1. Every route has a service or API test. A text scan of the route
   definitions can count this. No script runs it.
2. Branch coverage on the route handlers. It catches a route that passes a
   `null` result through, when that branch runs in no test. A test run with
   coverage measures it.
3. Mutation testing, per test. A test that kills no mutant that another test
   misses is a copy. A test run with mutation testing measures it.

**Evidence:** the same claims as `owning-layer.md`.

**Found by:** the three gaps that `owning-layer.md` lists: a route branch that
no test reached, a browser test that ran the timing for one case of two, and
unit tests that copied the CLI cases. This repository's instance is in
`.claude/writing-tests/found-by.md`, where that file exists.

**Why no script:** checks 2 and 3 are scripts, but not text scans. A test run,
coverage or mutation, measures each one. They stay here until a script runs
them.
