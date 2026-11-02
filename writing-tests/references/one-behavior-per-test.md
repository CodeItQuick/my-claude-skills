# One test checks one behavior

**Rule:** A test checks one promise that the code makes. It can use many
asserts to check that one promise. Split a test by behavior, never by the
number of asserts.

Three shapes have more than one act and are still one behavior:

- **Sequence:** the next step needs the state that the last assert checked.
  A test adds 250 to a score after a clamp to 0, and gets 250 only because the
  clamp held.
- **Guard:** the first assert checks a precondition, then the test acts. A
  test checks that a cart is empty before it counts two added items.
- **An e2e journey:** a browser setup takes seconds, so one test walks the flow
  with one setup. A test that runs the full setup twice is two tests.

**Apply it:** Does the second act need the result of the first assert? If the
answer is yes, keep one test. If the answer is no, split it. For one act with
two claims, keep one test when the title names both claims. If the title names
one, split the other claim out.

For a kept long test, move the arrangement into a named helper. That helper
then falls under `control-flow-in-a-helper.md`.

**Backed in code:** the `longTest` warning in `scripts/validate-tests.mjs`
flags a body over 20 lines. Length is never the defect: 10 of its 11 hits had
20 lines or fewer without blank and comment lines. The rule is not "fewer
asserts". The ledger grades that rule against: software_testing-97 (strong)
says that more assertions find more faults.

**Evidence:** No graded claim covers one behavior per test. `SKILL.md` keeps
arrange/act/assert and one assertion per test under "Still out".

**Found by:** three unit tests checked two behaviors each. In one, a failure
on the first case stopped the test and hid the second and third. The
`longTest` count found a browser test that checks one flow, then reloads and
replays the whole flow under reduced motion. This repository's instance is in
`.claude/writing-tests/found-by.md`, where that file exists.

**Why no script:** A script counted the tests that assert, act, then assert
again, in the unit, service and component layers. It found 19 of 1,126 tests,
and only 3 were real splits:

| Class | Count |
|---|---|
| False hit: the act only reads, for example `JSON.parse(res.body)` | 8 |
| Guard | 5 |
| Sequence | 3 |
| Real split | 3 |

The `longTest` hits, across the history of the source repository: 11 long
bodies. 4 were driving steps, 2 inline arrangement, 2 comments and blank
lines, 1 an e2e journey, 1 one act with two claims, and 1 a real split.

A rule that is right 3 times in 19 is noise. If the rule skips plain reads, it
is right 3 times in 11, and that is still noise. Whether the second act needs
the first result is a judgment about the code.
