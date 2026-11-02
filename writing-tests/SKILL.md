---
name: writing-tests
description: Use when writing or revising a JavaScript or TypeScript test file, unit or end-to-end — especially when a test needs an if, a loop, a ternary or a try/catch to say what it means. Also use when a test passes but you cannot say which case it exercised, when a suite is green and a bug shipped anyway, or when reviewing a test file for shape rather than coverage.
---

# Writing Tests

## Overview

A test with a branch in it asserts different things on different runs. Green
then means "one of several things held", and red does not say which. For
example:

```js
expect(backorders.size).toBe(lastOrder.inStock === true ? 0 : 1);
```

The test places an order and does not know whether the item is in stock.
So it asserts 0 on one run and 1 on another, and neither run shows that the
backorder works.

The extreme case puts four assertions behind
`if (body.inStock === false || …)`. On a run where the item comes back in
stock, the test asserts nothing and passes.

Assume that a test file has these shapes until you measure it with the
validator.

**The distinction the count cannot make.** Control flow that *drives* the system
is fine — adding 99 items to a cart needs a loop. Control flow that *decides an
assertion* is not. The rule is therefore about `expect`, not about `for`:

> Every `expect` in a test must run on every pass of that test.

A loop that clicks is driving. A stub that holds one request open is driving:
`if (call === 1) await paymentHeld` decides no assertion. A
loop with an `expect` whose subject changes per iteration is deciding. An `if`
around an `expect` is always deciding.

## The project file

The project file is `.claude/writing-tests/project.md`. It holds the
baselines, helper folders, run commands and seams with local skills for one
repository. The validator reads test roots from
`.claude/writing-tests/config.json` (`{ "roots": [...] }`). Without that file,
it scans every `*.test.*` and `*.spec.*` file under the working directory.
Claim ids such as software_testing-97 resolve in `references/evidence.md`.

If the repository has `.claude/writing-tests/project.md`, read it first.

## When to Use

- Writing a new test, unit or end-to-end
- A test needs an `if`, a `for`, a ternary or a `try/catch` to express itself
- "This suite is green but the bug shipped"
- Reviewing a test file for shape rather than for coverage

Not for: deciding *what* to test, or whether coverage is sufficient. This skill
is about the shape of a test once you know what it should assert. Also not for
a data file that a test imports, such as a fixture or a seed. It is data, not a
test.

## The seam with `writing-test-heuristics`

| This skill | `writing-test-heuristics` |
|---|---|
| Is this test honestly written? | Which question decides each hit? |
| Reads `references/*.md` before a new test | Writes `references/*.md` |
| Reports hits | Counts and classifies hits |
| `scripts/validate-tests.mjs` | `$HOME/.claude/skills/writing-test-heuristics/scripts/validate-heuristics.mjs` |

## Scope

**In:** the shape of a test, unit or end-to-end. That is whether every
assertion runs, where control flow may live,
whether an assertion checks the value that the test knows, and where helpers
and test doubles live.

**Out:** what to test and how much. Coverage is a different argument, and a
suite can be 100% covered and entirely vacuous, which is the failure this skill
exists for.

**Admitted by the evidence.** A craft topic comes in only when a graded claim
supports it:

- **Weak assertions**, as a counted warning. software_testing-97 (strong): the
  number of assertions drives fault detection. software_testing-100
  (moderate): written assertions observe less state than they can.
- **Ambient state**, as a method for "fix the setup". software_testing-83
  (strong) and -101 (moderate).
- **Identifier names in full words.** code_quality-23 (strong),
  software_testing-121 and -122 (moderate).

**Still out:**

- **Arrange/act/assert as a rule.** No graded claim supports it.
- **A test title convention as an invariant.** No claim covers test titles.
  "Test names" below is house style, with no gate.
- **One assertion per test.** software_testing-97 says the reverse. Split a
  test by behavior, never by assertion count.
- **A test shape: pyramid, trophy, diamond or cone.** software_testing-44 grades
  the pyramid prescription as folklore, and -43 is unsupported.

**Heuristics.** A house rule that no claim grades, but
that an observed failure supports, is a heuristic. It goes in `references/`,
one file for each heuristic, not in the Invariants. Every file has these
fields:

- **Rule:** what to do.
- **Apply it:** the question that decides one case.
- **Backed in code:** the scripts that check it, or "nothing yet".
- **Evidence:** the ledger claims that touch it, and their grades.
- **Found by:** the failures in the project that the rule would have prevented.
  A rule without one is a preference, and it does not go in.
- **Why no script:** what a script measured, or why a script cannot measure it.

Use `writing-test-heuristics` to add one. A heuristic leaves `references/` in one of two ways. If a ledger claim grades
it, move it to the Invariants. If a script can count it, move it to
`scripts/validate-tests.mjs`.

## Invariants

Check with `node $HOME/.claude/skills/writing-tests/scripts/validate-tests.mjs`.

`scripts/e2e/` is a taxonomy of test smells, one file for each of ten
families, from `01-assertion-does-not-run.test.mjs` to
`10-hard-to-read-or-change.test.mjs`.
Each rule has several failing variants, each with its reason, and the fixes
that pass. Read the family file for a worked example of a rule. The shared
helpers are in `scripts/e2e/validator-cli.mjs`. The validator's own tests run
with `node --test "$HOME/.claude/skills/writing-tests/scripts/**/*.test.mjs"` and
must pass its own checks.

The validator reports at three levels:

- **Failure** (exit 1): an exact pattern that is wrong in every case. Fix it
  before the commit.
- **Warning**: a heuristic. Read each one in the file that you touch, and fix
  it only if it is real. Detectors misclassify more than 70% of cases
  (software_testing-59), and smell rules are judged too strict (-24).
- **Info**: context, printed only with `--info`. Pass `--info` only for the
  file that you write or edit. Across the repo it is noise.

- **Every `expect` runs on every pass.** The whole rule. A test that can complete
  without reaching an assertion is a test that passes when the system is broken.
- **No `if`, `else`, `switch`, ternary, `||` or `??` fallback inside a test body.**
  Each one means the test does not know what it is asserting. `||` and `??` are
  included because `expect(a ?? b)` hides which of the two held. The validator also fails
  an `if` in a stub inside a test body. That `if` drives, so do not delete it.
  Move the stub to `<test root>/support/` (for example `support/fetch-stubs.ts`),
  where it becomes a warning.
- **No `try/catch` to assert a throw.** Use `expect(() => …).toThrow()`. A
  `try/catch` that forgets to fail in the no-throw path passes silently.
- **Loops may drive, never assert.** A `for` that clicks twenty-four times is
  fine. A `for` containing `expect` is a single test pretending to be twenty-four
  — when it fails you get one message and have to work out which iteration.
- **Parameterisation lives outside the test.** `for (const plan of plans)
  test(...)` in a `describe` is correct and the validator never flags it: it
  produces twelve named tests, each straight-line, each failing on its own.
- **A driving loop is a named helper.** `checkoutCart(page, cart)` reads as one
  step in the test. The same loop inline buries the assertions.
- **An e2e test does not branch on what is on screen.** `isVisible()` does not
  wait, so a probe races the re-render. An inline heading compare copied into
  two specs, outside the shared wait helper, carries the same flake into both.
  software_testing-14 and -15 (strong): async wait is a main cause of
  flakiness in JavaScript. This is the second reason for a named driving helper:
  the wait lives in one place.
- **No helper body is copied into two spec files.** The validator compares
  bodies, not names, so a rename does not clear a copy. Spacing next to
  punctuation does not count either. The cost of a copy is
  the change that reaches one copy and not the other (code_quality-48,
  moderate). "Duplicated code must be removed" is folklore (code_quality-52),
  so the rule is about copies that must change together, not about every shared
  line. A name in two files with different bodies is a warning: read both, and
  move them only if they must change together.
- **Helpers live in `<test root>/support/`, not in a spec file.** A spec file
  holds tests. `support/catalog.ts` is the shape: named for its
  subject, importable, and impossible to copy by accident because importing is
  easier than retyping.
- **Assert the exact value when the test knows it.** `toBeDefined()`,
  `toBeTruthy()`, `toBeFalsy()`, `expect(typeof …)`, `length > 0` and chai
  `ok`/`exist` pass for almost any value. So do `.not.toBeNull()`,
  `.not.toBeUndefined()` and a sign-only `toBeGreaterThan(0)`. The validator
  counts them as warnings. Each one is correct only where "it exists" is the
  whole contract. `expect(list.every(…)).toBe(true)` and `Array.isArray(…)`
  collapse a value to a boolean, so a failure reports `false` and hides it.
  Chai counts the same: `.to.eq(true)`, `.to.equal(false)` and `.to.be.true`.
  Warning. `expect(list.filter(…)).toEqual([])` shows the value.
- **The expected value is a literal.** Write `toBe(10)`, not `toBe(MAX_CART_ITEMS)`.
  A SCREAMING_CASE name imported from the code under test, and read as the
  expected value of `toBe`, `toEqual`, `toStrictEqual`, `toMatchObject`,
  `toHaveLength`, `toContain` or chai `eq`, fails. If that constant is wrong,
  the test still passes. A module-level `const` that only names a number,
  string or boolean, read as the expected value, is a warning: it hides the
  value from the reader. Put the reason in a comment beside the literal. Three
  uses of a name stay legal: an input (`RIGHT_ON_A_ZERO_DRAW`), an object the
  test saved and reads back, and a camelCase import checked by identity
  (`toBe(defaultShippingRule)`).
- **No ambient state inside a test.** `Date.now()`, `new Date()` and
  `Math.random()` fail unless the file controls them: fake timers for the
  clock, a spy on `Math.random` for the draw. software_testing-83 (strong),
  -101 (moderate).
- **No fixed sleep.** `waitForTimeout()` always fails. `setTimeout()` fails
  unless the file uses fake timers. Wait for a condition instead.
  software_testing-14 (strong). In a test-file helper, ambient state and a
  fixed sleep are warnings.
- **Control flow in a hook is a warning,** as in a helper. An `if` whose whole
  statement is one `delete`, the usual `process.env` restore, is exempt.
- **Every test asserts.** A test body with no `expect`, `assert`, `should` or
  helper named `expect…`/`assert…` fails. software_testing-97 (strong).
- **Compare with a matcher, not inside the assertion.** `expect(a === b).toBe(true)`
  and `assert(a < b)` fail, because a failure reports `false` and hides both
  values. software_testing-100 (moderate).
- **One test body is not written twice in one file.** The check is per file:
  two files can share a body word for word and check different modules
  through their imports. code_quality-48 (moderate).
- **Restore every fake, spy and stub in an `afterEach` or `afterAll`.**
  `useFakeTimers` needs `useRealTimers`, `spyOn` needs `restoreAllMocks` or
  `mockRestore`, `stubGlobal` needs `unstubAllGlobals`, and `stubEnv` needs
  `unstubAllEnvs`. `Math.random = …` needs the original assigned back. A
  restore at the end of a test body does not count: a failed assertion before
  it skips it, and every later test inherits the fake. software_testing-15 and
  -83 (strong). The check follows a spec's relative imports one level, static
  or `await import()`, so a setup inside a `support/` helper counts at the
  spec's call.
- **No `.only` in a committed file.** It runs one test, skips the rest, and
  reports the run green. Failure. software_testing-93 (moderate).
- **Await every async assertion.** `resolves`, `rejects`, `expect.poll` and a
  Playwright web-first matcher need `await` or `return`. Without it the test
  can end before the assertion runs. Failure. software_testing-14 and -15
  (strong).
- **An e2e assertion retries.** `expect(await locator.isVisible())` and the
  other one-time reads (`textContent`, `count`, `evaluate`, …) check the page
  once. Use a web-first matcher, which retries. Failure, in Playwright files
  only. software_testing-14 and -15 (strong). The same read held in a
  `const` and then asserted is a warning: a helper that waits first is not
  visible to the validator. `toPass` counts as a web-first matcher.
- **No `console` output inside a test.** A logged probe looks like a check.
  Assert the value or delete the line. Warning.
- **No `process.env` inside a test body.** Stub it with `vi.stubEnv`, and
  unstub it in `afterEach`. Warning. software_testing-83 (strong).
- **No real network call inside a test.** `fetch`, `axios` or `http.get` to an
  `http(s)://` URL fails when the host is down. Stub it or use `msw`. Warning,
  and not in Playwright files. software_testing-83 (strong).
- **No `let` that tests share.** A `let` outside the tests that a test assigns
  makes the result depend on the order. Reset it in `beforeEach`. Warning.
  software_testing-14 and -15 (strong).
- **A test body is 20 lines or fewer.** Test size has a strong measured effect
  on flakiness (software_testing-84, moderate), and long tests are the
  flakiest (-19, moderate). The limit sits just above the 99th percentile of
  one measured suite. Warning.
- **Info only:** a `vi.mock` of a relative or `@/` path couples the test to
  domain code (software_testing-33 and -34, moderate). A `let` reassigned
  inside a test carries the highest fault hazard among JavaScript smells
  (frontend-16, moderate). A `for (let …)` loop counter does not count.

## Fixing the shapes

**Conditional assertion** — the vacuous pass.

```js
// Passes when the item is in stock, asserting nothing.
if (body.inStock === false) expect(body.order.lines).toHaveLength(4);

// Assert the condition too, so a surprise is a failure.
expect(body.inStock).toBe(false);
expect(body.order.lines).toHaveLength(4);
```

If the condition genuinely varies, the test does not control its input. Fix the
setup, not the assertion. An assertion on a value that the test does not
control is brittle by construction (software_testing-101). Look for the three
ambient inputs (software_testing-83), and control the one that varies:

| Input | Control it with |
|---|---|
| The clock | `vi.useFakeTimers().setSystemTime(…)`, and `vi.useRealTimers()` in `afterEach` |
| A random draw | A source built in the test, so the result is known. Or pick an input where every draw meets the precondition, for example a catalog where every product has a price. |
| The environment | Save and restore in `beforeEach`/`afterEach`, from one module in `support/` |

**Loop containing expect** — one test pretending to be many.

```js
// One failure message for nine items.
for (const item of items) expect(totals[item]).toBeGreaterThan(0);

// Assert the whole shape at once: the message names the item that differed.
expect(totals).toEqual({ apples: expect.any(Number), /* ... */ });
// Or parameterise, when each case deserves its own name.
for (const item of items) it(`totals ${item}`, () => { /* ... */ });
```

**Ternary in an expectation** — the test computing the answer it wants.

```js
expect(total).toBe(hasDiscount ? 90 : 100);   // reimplements the code under test
```

Two tests, each with a literal. A test that computes its expectation passes when
the computation and the code are wrong in the same way.

**try/catch for a throw.**

```js
try { parse(bad); expect.fail('should have thrown'); } catch (e) { /* ... */ }
expect(() => parse(bad)).toThrow(/unparseable/);   // this instead
```

**Weak assertion** — the test knows more than it checks.

```js
// Passes for any user with a numeric timestamp.
expect(user).toBeDefined();
expect(typeof user.createdAt).toBe('number');

// The source of create() says what it stores.
const created = store.create('abc', 'guest');
expect(store.get('abc')).toBe(created);
expect(created).toMatchObject({ role: 'guest', cart: [], total: 0 });
```

If the value comes from the clock or a random draw, control that input first.
Then the exact value is known.

## Test names

House style, not an invariant: no graded claim covers test titles.

- **A title states the behavior that the test checks, and nothing more.**
  A title that promises "every product can be bought" and checks one buy
  button disagrees with its code. A
  name that disagrees with its code raises cognitive load (code_quality-92,
  moderate).
- **No "should" and no "works correctly".** Write the behavior: "rejects an
  empty cart".
- **Identifiers in a test are full words.** code_quality-23 (strong). A number
  that the test passes in gets a named constant that points at its source:
  `const FREE_SHIPPING_THRESHOLD = 50; // src/shipping.ts:4`. A
  number that the test expects stays a literal, with its source in a comment.
- **Rename a file when you touch it, never in a sweep.** software_testing-24
  (moderate): smell rules are widely judged too strict.

## Where helpers live

Each test root has one `support/` folder. Read it before you write a helper.
Otherwise a constant such as a base URL gets copied after a support module
already exports it.

One module per subject, named for what it provides rather than for being a
helper: `catalog.ts`, `customer.ts`, `orders.ts`, `mounting.ts`. A file
called `helpers.ts` becomes a junk drawer, because nothing is ever the wrong
place to put something.

**What moves.** Anything a spec file defines that is not a test: driving loops,
answer strategies, mount wrappers, fetch mocks, shared constants like `HOST`.

**Test doubles move first.** A double can carry its own mistakes
(software_testing-36, moderate), and every copy carries them separately.
Test isolation means isolation from a dependency and from another test. An
auth fake with three bodies in three specs is the next candidate for
`support/`. So is a database URL that six specs save by hand.

**What stays.** A one-line arrangement used by a single test, where naming it
would cost more than reading it. The test that says what it does in three lines
does not need a helper.

**The trigger is the second use, not the fifth.** A nine-line escape helper in
two specs must move the moment the second spec wants it.
Waiting for a third means the third is written by copying whichever
copy was nearest.

**Moving a helper out is not hiding it.** The validator warns on control flow in
helpers wherever they live — a support module gets read the same way, and a
conditional that decides an assertion is still a defect there. The reason to
move is reuse and a spec file that reads as a list of behaviours, never to quiet
the report.

## Running one file

Run the file alone, with a command that exits. A bare `vitest` watches and
does not exit, so use `vitest run`. The project file gives the command for
each package.

If the tests load built output, build first, or the suite tests the old code.

## Process

Two paths. For a test that you write now, follow "Writing a new test". For an
existing test file, follow steps 1 to 4.

### Writing a new test

1. Read the heuristics in `references/`, then decide which layer owns the
   behavior. Write the test in the shapes above.
2. Run the validator on that file, with `--info`:
   ```bash
   node $HOME/.claude/skills/writing-tests/scripts/validate-tests.mjs --info <file>
   ```
3. Fix every failure in your new test before the commit. Read every warning
   and every info line in it.
4. Run the file alone.

Do not stop between these steps. The Stop below is for an existing test. A new
test has no guarantee yet to lose. Smells come in with the first commit and
stay (software_testing-23, strong), and most flaky tests are flaky from the
start (software_testing-16, moderate). So the commit that adds the test is the
cheapest place to fix it.

### 1. Measure an existing test file

Work **one test file per invocation**. A sweep across seven files produces
seven shallow rewrites and one enormous diff nobody reviews.

```bash
node $HOME/.claude/skills/writing-tests/scripts/validate-tests.mjs <file>
```

Read every hit before changing anything. Some are driving loops that only need
moving into a helper; some are vacuous passes that have never tested anything.

### 2. Classify each hit

Driving or deciding. Deciding hits are defects and get fixed. Driving hits move
into a named helper, and the helper gets no `expect` that varies by iteration.
A regex cannot tell the two apart: heuristic smell detectors misclassify over
70% of instances (software_testing-59, moderate). The classification is the
work, not the count. For a hit in a helper, the question that decides it is in
`references/control-flow-in-a-helper.md`.

### 3. Stop

Report what each hit is and which are vacuous, and **wait**. Do not rewrite the
tests in the same pass that diagnosed them.

The default outcome of this skill is a classified list, nothing else. A test
rewrite arriving with its own justification gets far less scrutiny than one that
arrives after the justification has been accepted — and rewriting a test changes
what the suite guarantees, which is exactly the change that should be read
slowly.

### 4. Fix (only when asked)

One file. Apply the shapes above. Then run that file alone.

A rewrite that makes a previously-vacuous test assert something may go red. That
is the test finding a real defect, not a regression in your edit — read it before
you "fix" it. If you do not know whether the test or the production code is
wrong, say why it can be either, and ask the user.

## Common Mistakes

- **Deleting the condition instead of asserting it.** Removing `if (x)` and
  keeping the body makes the test fail on the other path, which looks like the
  same bug and is not. Assert `x`, then assert the body.
- **Moving a conditional into a helper to quiet the script.** The validator
  warns rather than fails on helpers precisely because that is where this hides.
  A helper that decides an assertion is the same defect one function further
  away.
- **Reading a loop over cases as a driving loop.** Nine `expect`s in a `for` is
  nine tests wearing one name. The failure message is the tell: if it cannot say
  which case broke, it should have been nine tests.
- **Parameterising with a loop inside the test instead of around it.** Around it
  produces named tests that fail independently. Inside it produces one test that
  stops at the first failure and hides the rest.
- **Treating the counts as a cleanup task.** They are a list of places where the
  suite may not test what it claims. Work them one file at a time, when you
  touch that file anyway.
- **Copying a helper into the second spec that needs it.** It is faster than
  extracting for exactly as long as it takes the two to diverge. Two specs
  written on the same day each get a copy of the same start helper, and a
  constant gets copied after a support module exports it.
- **Renaming a helper to clear the report.** The validator compares bodies, so a
  rename does nothing to a copy. Two `mountAndFlush` wrappers that share only a
  name are a correct rename, because their bodies differ.
- **Naming the module `helpers.ts`.** Everything qualifies, so everything lands
  there, and nobody can tell from an import what they are getting. Name it for
  the subject.
- **Replacing a weak assertion with a guess.** An exact value that you did not
  read from the production code or a fixture is a new defect. Name the source
  line next to the literal: `toBe(2000); // Account.creditLimit, src/account.ts:6`.
- **Splitting a test into one assertion each.** That lowers what the suite
  detects (software_testing-97). Split by behavior.
- **Finding an object with `includes`.** `includes`, `indexOf` and a `Set`
  compare objects and arrays by reference, and each parsed JSON payload is a
  new object. So `second.filter(order => first.includes(order))` is always
  `[]`, and the test passes whatever the app does. A "not shown again" test
  that does this fails as soon as it compares the order ids. Map each
  payload to a string or a number first. No script checks this: a regex cannot
  tell an array of objects from an array of strings.
