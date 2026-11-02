# The expected value is not a formula

**Rule:** An expected value built with arithmetic over a name is a warning. A
copy of the formula under test passes when the copy and the code are wrong in
the same way. A relation between two values that the test read checks only
that the two reads agree.

**Apply it:** Name a wrong version of the code that also gives this expected
value. Try a wrong constant, a wrong rounding, a change of zero and a flipped
sign. If one exists, pin the value. Write the literal with the formula in a
comment, or add an assert on the sign or the size. If the input comes from a
random draw or the clock, control it first. Then the literal is known. If no
wrong version gives the value, keep the expression. Read the test title and
the production code that the expression copies, not only the flagged line.

**Example:** a test for rounding reads its input from a random draw:

```js
it('rounds a share that does not divide evenly', () => {
    const worth = questioner.getCurrentQuestionMmr();   // 40 or 45, by the draw
    game.partialCreditAnswer(0.333);
    expect(gainOf(game)).toBe(Math.round(worth * 0.333));
});
```

At 40 the share is 13.32, and `Math.floor` also gives 13. At 45 the share is
14.985, and `Math.ceil` also gives 15. So each run lets one wrong rounding
pass. Two tests with a fixed worth and the literals 13 and 15 catch both.

**Backed in code:** the `computed` warning in `scripts/validate-tests.mjs`
finds arithmetic over a name in the expected argument of a matcher, or of
assert-style `equal`, `strictEqual`, `deepEqual` and `lengthOf`. It also flags
arithmetic in an array index and in a sort comparator. That arithmetic builds
no expected value.

**Evidence:** No graded claim covers a computed expected value.
software_testing-101 (moderate) backs the control of the input: an assert on a
value that the test does not control is brittle. software_testing-59
(moderate) grades the detector.

**Found by:** a test titled for rounding read its input from a random draw and
copied the rounding call of the code. Each draw let one wrong rounding pass.
The same count found a relation between two reads in a test titled for a gain,
with no assert on the sign. This repository's instance is in
`.claude/writing-tests/found-by.md`, where that file exists.

**Why no script:** 14 distinct hits, live and from snapshots across the
commits in the source repository:

| Class | Count |
|---|---|
| Formula copy: the expression repeats the formula of the code under test | 5 |
| Relation: the expression relates two values that the test read | 6 |
| Echo: the expression repeats an input of the test | 1 |
| False hit: arithmetic in an array index or a sort comparator | 2 |

5 hits were defects: 2 formula copies and 3 relations. Two tables agreed on
the class of all 14 hits, and differed on the defect for 3. A read of each
kept all 3 as defects. The script cannot tell a copy from a relation, and it
cannot read the title. The question needs both.
