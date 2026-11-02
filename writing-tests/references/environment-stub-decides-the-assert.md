# An environment stub must decide the assert

**Rule:** A test that sets an environment variable must fail when the
variable has its other value. If the assert holds either way, the stub decides
nothing, and the test checks less than its setup claims.

**Apply it:** Give the variable that this test sets its other value, set or
unset. Does the test still pass? Read the code that reads the variable, not
only the test. If yes, it is a defect. If no, the value is a controlled input:
make sure that a hook puts it back.

**Example:** the code under test reads one variable:

```js
function authorize(request) {
  const issuer = process.env.AUTH_ISSUER;
  if (!issuer) return 401;
  if (!verify(request.token, issuer)) return 401;
  return 200;
}
```

The test "refuses a user whose token does not verify" stubs `AUTH_ISSUER` and
asserts 401. With the stub, the bad token gets 401 from the `verify` check.
Without it, the same request gets 401 from the `!issuer` check. So the test
passes if the stub is lost.

**Backed in code:** the `environment` warning in `scripts/validate-tests.mjs`
finds `process.env` in a test body. It exempts a whole file that calls
`stubEnv`, so a stub that decides nothing does not show.

**Evidence:** software_testing-83 (strong) says that a test that reads the
environment is non-deterministic. That claim backs the rule "no raw
`process.env` in a test", which is an Invariant in `SKILL.md`. No claim grades
this question. software_testing-59 (moderate) grades the detector.

**Found by:** two tests stubbed an identity variable and asserted 401. A later
change restored the variable with a hook, but it kept the asserts, so the
defect survived. This repository's instance is in
`.claude/writing-tests/found-by.md`, where that file exists.

**Why no script:** the past hits, from snapshots across the fix commits in the
source repository:

| Class | Count |
|---|---|
| Controlled set, restored by a hook | 8 |
| Controlled set, restored in the body | 4 |
| Restore line in the body | 6 |
| Defect: the assert holds on both values | 4 |

22 hits are 11 tests. The script is right 4 times in 22. Only the code that
reads the variable shows whether the assert depends on it. A first pass that
read the tests alone found no defect.
