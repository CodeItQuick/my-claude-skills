# A branch in a helper is a defect only if a caller still passes on its other path

**Rule:** Control flow in a helper is usually a driving step, a default or a
fake. It is a defect when one of its paths lets a calling test assert less, or
assert something else, and still pass.

**Apply it:** Give this branch its other path. Does a test that calls the
helper then assert less, or assert something else, and still pass? If yes, it is a
defect. If no, it is a driving step, a default or a fake. Read the callers,
not only the helper. A quiet `return` in setup is a yes when a caller asserts
an absence. For a `beforeEach` or `beforeAll` hook, the callers are the tests
in its block.

**Example:** a setup helper held:

```js
async function placeOrder(cart) {
  const body = await checkout(cart);
  if (!body.orderCreated) return body;
  await pay(body.orderId);
  return body;
}
```

A refused checkout returned quietly. The test "records no refund for a paid
order" then asserts that `refunds.length` is 0. It is 0 when nothing ran, so
the test passes with no setup.

**Backed in code:** the `helper` warning in `scripts/validate-tests.mjs` finds
the candidates. It reads spec files only, so it does not scan a helper in a
separate support module. The `hookFlow` warning finds the same shape in a hook.

**Evidence:** No graded claim covers the rule. software_testing-59 (moderate)
grades the detector: heuristic smell tools misclassify over 70% of instances.

**Found by:** two setup helpers returned quietly on a refused start. A move
into a shared support module cleared the warning, but the new helper did not
check the start either, so the defect probably survived. This repository's
instance is in `.claude/writing-tests/found-by.md`, where that file exists.

**Why no script:** the past hits, from snapshots across the fix commits in the
source repository:

| Class | Count |
|---|---|
| Driving step: a fixed-count loop that steps the app or seeds a store | 10 |
| Default: `??` or a default that fills an omitted argument | 8 |
| Caller switch: a branch on a parameter that each test fixes | 6 |
| Fake: a stub that picks a reply by request or call count | 3 |
| System reply: a poll-until loop that throws at its cap | 2 |
| Formula: a branch inside arithmetic | 1 |
| False hit: one ternary reported again for each nested helper | 2 |
| Defect | 2 |

`hookFlow` had 1 hit in all of history: a loop that seeds four records. Every
test in its block asserts an exact id list, so the loop decides nothing. The
script exempts 5 more hooks that only restore `process.env`.

The script is right 2 times in 34 for `helper`. Only the callers show whether a
path lets a test pass with less, and the script reads the helper alone. A first
pass that read the helper alone missed both defects.
