# An assert must be able to fail

**Rule:** A weak matcher is correct only when presence, sign or range is the
whole promise. Every other weak assert either checks less than the test knows,
or it cannot fail at all.

**Apply it:** Name one wrong value that this assert rejects. If you cannot name
one, the assert is dead: rewrite it. If the test controls every input, assert
the exact value. If an input comes from a random draw or the clock, control
that input first, as "Fixing the shapes" in `SKILL.md` says. Then check the
title: does an assert in the test check the property that the title names?
A collapsed boolean from a `has(key)` that is itself the API under test is a
Contract hit: the boolean is the whole promise.

**Example:** a test held this assert:

```js
const order = { total: 0, status: 'open' };
expect(order.amount ?? order.status).toBeTruthy();
```

The object has the key `total`, not `amount`, so `??` always gives `status`.
`'open'` is a non-empty string. A non-empty string is truthy, so the assert
cannot fail. `expect(order.total).toBe(0)` checks the promise.

**Backed in code:** the `weak` warning in `scripts/validate-tests.mjs` finds
eight weak matcher shapes and a boolean collapsed by `every`, `some` or `has`.
It does not flag `toBeTypeOf`, `expect.any(String)`,
`expect.stringMatching(/./)` or `not.toHaveLength(0)`. These shapes are known
gaps in the detector.

**Evidence:** software_testing-100 (moderate) says that written asserts observe
less state than they can, and software_testing-97 (strong) says that more
asserts find more faults. software_testing-99 (moderate) limits the rule: a
check on part of the output finds nearly as many failures as a check on all of
it. So a presence check stays where presence is the whole promise.
software_testing-59 (moderate) grades the detector.

**Found by:** a test that a random pool never runs dry checked only that each
draw had a category. An empty pool still gave a category, so blank items went
unseen. This repository's instance is in `.claude/writing-tests/found-by.md`,
where that file exists.

**Why no script:** 114 distinct asserts, from snapshots across the fix commits
in the source repository:

| Class | Count |
|---|---|
| Uncontrolled: the exact value comes from a random draw or the clock | 31 |
| Collapsed: the predicate is right, and a failure shows only `false` | 27 |
| Knowable: the test fixes the exact value and checks less | 23 |
| Contract: presence, sign or range is the whole promise | 15 |
| Guard: a later assert checks the same subject exactly | 10 |
| Vacuous, carried: cannot fail, but another assert checks the title | 5 |
| Defect: cannot fail, or the title names a property that nothing checks | 3 |

Two independent tables agreed on 57 of 114. The split was the defect bar.
"A realistic wrong value passes" is the warning's own target, and it holds for
almost every knowable hit. The bar here is narrower: the assert cannot fail,
or the title names a property that nothing checks.

The collapsed hits are the exception: the script was right on 27 of 30. That
part can become its own validator section.
