---
name: writing-test-heuristics
description: Use when adding a heuristic to the writing-tests skill's references/ folder, when a validate-tests.mjs warning or info section has hits and no written question decides them, or when a testing rule of thumb is proposed and no graded claim backs it. Also use when a heuristic file is missing a field, or names a validator section that no longer exists.
---

# Writing Test Heuristics

## Overview

The validator in `writing-tests` reports 15 judged sections: 13 warnings and 2
info. A judged section finds candidates, and a person decides each one. The
script cannot tell a driving loop from a deciding loop, or a guard assert from
a second behavior. That decision is the heuristic.

The first three heuristics came from ideas that the user had before any
count. Two of them went wrong at first:

- "Fewer asserts per test" was graded against by software_testing-97 (strong).
  Only the kernel, one behavior per test, survived.
- The first owning-layer entry held two judgments and was split a commit
  later.

Now the heuristics come from the validator's judged sections.

**Confirmed baseline:** the first full run, in the source repository, covered
all 15 sections.

- 9 sections have a heuristic, in 7 files. `hookFlow` joined the `helper`
  file, and `longTest` joined `one-behavior-per-test.md`.
- 6 sections are "not yet": `mockedOwn`, `reassigned`, `helperAmbient`,
  `helperSleep`, `network` and `shared`. Three of them had 0 hits in all of
  history.
- The run filed 14 tickets. Most defects were in tests that a fix had cleared
  from the report and kept.

A warning count of 0 does not mean that the hits were fixed.

A heuristic file has six fields: Rule, Apply it, Backed in code, Evidence,
Found by, and Why no script. `writing-tests/SKILL.md` defines them.

## The project file

The project facts live in the repository, not here. If the repository has
`.claude/writing-tests/project.md`, read it first. It can name:

- the backlog, and the skill or script that files a ticket
- a ledger of graded claims beyond `writing-tests/references/evidence.md`
- the test folders, for the snapshots in step 4
- a skill validator to run in step 8

If it does not name one, that step uses the default that it states.

## When to Use

- "Write a heuristic for the `<section>` warning"
- "Turn this rule of thumb into a heuristic"
- The validator reports a warning, and you cannot say which question decides it
- `validate-heuristics.mjs` shows a section with "none yet"
- A "not yet" section gets new hits

Not for: adding or changing a validator section (that is `writing-tests`), or
fixing the tests that a count finds (file them in the project's backlog).

## The seam with `writing-tests`

| This skill | `writing-tests` |
|---|---|
| Which question decides each hit? | Is this test honestly written? |
| Writes `references/*.md` | Reads `references/*.md` before a new test |
| Classifies all the hits of one section, across history | Classifies the hits in one file |
| `scripts/validate-heuristics.mjs` | `$HOME/.claude/skills/writing-tests/scripts/validate-tests.mjs` |

A heuristic whose proxy is right on most hits is a validator section. Hand it
to `writing-tests`. The `collapsed` part of `weak` was right on 27 of 30.

## Scope

**In:** the 15 judged sections, and a rule of thumb that no graded claim
backs.

**Out permanently:** the 12 failure sections. The script decides each hit, so
no person decides anything.

**Deferred:** heuristics for skills other than `writing-tests`, until a second
skill has a validator with judged sections.

## Invariants

Check with `node $HOME/.claude/skills/writing-test-heuristics/scripts/validate-heuristics.mjs`.

- **Every heuristic file has the six fields.** The fields are what make an
  entry a heuristic and not a preference. "Found by" is the one that is
  dropped first.
- **"Backed in code" names its validator section key in backticks**, for
  example `` `helper` ``. The script reads the key to find which sections have
  a heuristic. A key that the validator renames fails, so the link cannot rot.
- **One judgment per file.** Two judgments in one file get one "Apply it"
  question that fits neither. One key can hold two judgments: the `weak` key
  holds weak matchers and collapsed booleans. Then two files can name the
  same key.
- **No heuristic without a real defect in "Found by".** If a count finds only
  driving steps, guards and false hits, the answer is "not yet". A section
  that joins an existing heuristic needs no defect of its own.
- **The rule stays in `writing-tests`. The question moves here.** The rule is
  what the script flags. The question decides each flagged hit. One copy of
  each, so they cannot drift apart.
- **A heuristic file holds no fact about one repository.** The file travels
  with the skill. The instance goes in `.claude/writing-tests/found-by.md` in
  the repository where it was found.

## Process

Work **one section or one idea per invocation**. Two at a time share one
classification pass, and the classes blur. Steps 1 to 6 only read, so
separate sections can run in parallel sessions. Step 7 writes the backlog and
`writing-tests/SKILL.md`, so it runs in one session, one section at a time.

### 1. Measure

```bash
node $HOME/.claude/skills/writing-test-heuristics/scripts/validate-heuristics.mjs
```

Pick one section with "none yet". For an idea with no section, go to step 3.

Read the files in `writing-tests/references/` first. A section can share a
question with a heuristic that exists: `hookFlow` asks the `helper` question
about the tests in a block, not the callers. Count it anyway.

### 2. Read the rule, and name the classes

The section key appears in the CLI expected results, not in the case titles.
Find the cases by the result key or by the `describe` heading:

```bash
grep -rn "{ <key>:" $HOME/.claude/skills/writing-tests/scripts/e2e/
grep -n "'<key>'" $HOME/.claude/skills/writing-tests/scripts/e2e/validator-cli.mjs
```

The pass cases carry no result key, so only the `describe` heading finds them.
Then find every place in `writing-tests/SKILL.md` that states the rule.

- If the prose and the CLI cases disagree, the cases are the behavior. File
  the prose.
- Read each warn case against the question that you expect. A warn case can
  hold a second judgment.

**Name the classes now**, from the cases, before you see a hit. Always include
**false hit**: a call that only reads, or a duplicate report of one line. You
may revise the classes once, after a first read of the hits. Record what you
added.

### 3. Check the evidence

Read the claims that `writing-tests/SKILL.md` cites for this rule first:

```bash
grep -n -o -E "software_testing-[0-9]+|code_quality-[0-9]+" $HOME/.claude/skills/writing-tests/SKILL.md | sort -u
```

Each claim is in `writing-tests/references/evidence.md`. Check that each cited
claim says what the prose says. One run found software_testing-19, which
measures execution time, cited for body length. Then search
`evidence.md`, and the project's ledger if `project.md` names one, for the
words of the shape, and for `smell`, `heuristic` and `detector`.

Keep the rule apart from the question. A claim that backs the rule ends
nothing: the rule is already an Invariant, and the question still decides the
hits. Sort each claim that you find:

- **Grades the idea against:** drop it, or keep only the part that the claim
  does not touch.
- **Backs the question:** it belongs in the Invariants of `writing-tests`, not
  in `references/`.
- **Backs or limits the rule:** put it in "Evidence". software_testing-99
  limits `weak`: a partial check finds nearly as many failures as a full one.
- **Grades the detector:** software_testing-59. Put it in "Why no script".

### 4. Collect the hits

Follow `references/collecting-hits.md`. It covers live hits, snapshots of past
commits, the ways that a fix clears a hit and keeps the code, when to widen a
small count, and one probe for detector misses.

### 5. Classify the hits

Classify each hit as it was before the fix, then check what the fix did. A
cleared warning is not a fixed defect: one fix cleared a quiet-return guard
and kept the vacuous pass.

**Read what decides the hit, not only the flagged span.** That is:

- the callers, for a helper
- the tests in the block, for a hook
- the production code that reads the value, for an environment variable
- every use of the name, for a named literal
- the test title, for an assert

**The defect bar:** a hit is a defect when the assert cannot fail, when one
path lets a test pass with less, or when the title names a property that no
assert checks. "A realistic wrong value passes" is the warning's own target,
not the bar. With that bar, two `weak` tables counted 39 defects and 3.

Keep the class and the defect on two axes. A long body is a driving loop or an
arrangement, and it can hold a defect that another question decides. File
that defect against its own question, not against this section.

**Two tables above ten hits.** Give a subagent the hit list, the bodies, what
decides each hit, and the classes, in batches of about 30 hits. Tell it to be
strict. Classify the same hits yourself, compare, and read every hit where the
tables differ. At ten hits or fewer, one careful table is enough.

### 6. Stop

Report the table of classes and counts, the proposed "Apply it" question, and
the real defects. **Do not write the heuristic file in this pass.** If there
is no real defect, report "not yet" and stop.

- A defect counts in "Found by" if a hit of this section exposes it, even when
  another section also flags it. Name the defect that only this section
  found, if there is one.
- For each defect, say whether it survives at HEAD. If a read says "probably",
  confirm it with a scratch mutant where that is cheap. One run confirmed a
  CORS echo with a one-line change to an installed package, in a scratch copy.

### 7. Write (only when asked)

- If the existing question decides every hit, add the section key to that
  file's "Backed in code" and its count to "Why no script". Write no new file.
- If it decides all hits but one, amend the existing question for that case
  and join. `longTest` added "one act, two claims" to
  `one-behavior-per-test.md`.
- Otherwise write one file in `writing-tests/references/`, named for the rule,
  with the six fields. Write "Found by" in general terms, and end it with the
  pointer to `found-by.md` that the other files use.
- Add this repository's instance to `.claude/writing-tests/found-by.md`.
- Move the deciding question out of `writing-tests/SKILL.md` into the file,
  and leave a link where it was. If the text holds no question, there is
  nothing to move.
- File the real defects, the prose that disagrees, and the detector misses in
  the backlog that `project.md` names. Do not fix them. Without a backlog, list
  them in the report.

### 8. Validate and commit

```bash
node $HOME/.claude/skills/writing-test-heuristics/scripts/validate-heuristics.mjs
```

Then run the skill validator and the backlog validator that `project.md`
names, if any.

`$HOME/.claude/skills` and the project are two repositories. Commit the
heuristic file in the skills repository, and `found-by.md` and the tickets in
the project. Each commit changes no program behavior.

## Common Mistakes

- **Writing the heuristic from what you already believe.** "Fewer asserts"
  felt true, and software_testing-97 (strong) says the reverse. Step 3 comes
  before the count for this reason.
- **Two judgments in one file.** The owning-layer entry also held "check the
  wiring, not a copy". It was split a commit later.
- **A count with no false-hit class.** Without it, 19 hits read as 19 defects.
  The real number was 3.
- **Reading a warning count of 0 as "fixed".** The fixes moved, reshaped,
  exempted or renamed the hits. 7 of the 14 tickets in the first run were for
  defects that a fix had cleared from the report.
- **Collecting past hits from diffs or samples.** A diff shows a helper move,
  not the flagged line. A sample misses short hits. Snapshots of the commits
  that `git log -G` finds give the exact count.
- **Classifying a hit without what decides it.** The first pass read the
  helper alone, and missed both `helper` defects. The first `environment` pass
  read the tests alone, and missed the 401 that the route gives either way.
- **A defect bar as wide as the warning.** "A wrong value passes" makes almost
  every weak hit a defect, and the table says nothing.
- **Promoting a low-precision proxy to a validator section.** A rule that is
  right 3 times in 19 trains the reader to skip the section.
- **Fixing the tests that the count found.** The 14 tickets of the first run
  were filed, not fixed. The fix changes what the suite guarantees, so it gets
  its own diff.
- **A repository fact in a heuristic file.** The file travels to codebases
  that have no such path or ticket. Put the fact in `found-by.md`.
