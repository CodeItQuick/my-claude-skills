# Collecting hits

Step 4 of the Process. Put every snapshot and scratch script in the
scratchpad, never in the repo.

## Live hits

```bash
node $HOME/.claude/skills/writing-tests/scripts/validate-tests.mjs --info
```

An empty section prints no heading. So 0 hits and a failed run look the same.
Check the `Test files:` line before you record a 0.

## Past hits: snapshots, not diffs

A diff shows a helper move, not the line that the validator flagged. Run
today's validator on a snapshot of each commit instead:

```bash
git archive <commit> <folders> | tar -x -C <scratch dir>/<commit>
(cd <scratch dir>/<commit> && node $HOME/.claude/skills/writing-tests/scripts/validate-tests.mjs)
```

- On an old commit, `git archive` fails if a folder did not exist then. Keep
  only the folders that `git cat-file -e <commit>:<folder>` finds.
- Find the commits that touched the shape with a search, not a sample:
  `git log --all --oneline -G '<regex for the shape>' -- <test folders>`.
  `project.md` names the test folders. Without it, use the roots in
  `.claude/writing-tests/config.json`.
  A sample of every 40th commit misses a hit that lived for a day, and it
  cannot name the commit that cleared it.
- Snapshots from before the section existed are valid. Today's validator reads
  them correctly.
- Run all the test folders in one run for a section that compares files
  (`sameName`, `copied`). One folder at a time hides a pair.
- Key each hit by file, name and source text, not by line. Lines move between
  snapshots, and one reword can look like two hits.

## Cleared is not fixed

For each cleared hit, find how it left the report:

- **Removed:** the shape is gone.
- **Moved out of scope:** into `support/`, which the validator does not scan.
- **Reshaped:** into a form that the detector does not flag. `weak` fixes used
  `toBeTypeOf` and `expect.any(String)`.
- **Exempted:** a whole file that calls `vi.stubEnv` is exempt from
  `environment`.
- **Renamed:** a rename clears `sameName` and keeps a copy.

Read the ticket or commit message that cleared it. One fix kept an origin
constant as an input on purpose, and that kept the defect.

## Widen when the count is small

Count distinct decisions, not lines: 7 `namedLiteral` hits were 2 names. If
there are fewer than five, widen once:

- The `support/` modules, copied into the scratchpad as spec files. This
  applies only to the sections that read helpers: `helper`, `helperAmbient`,
  `helperSleep` and `sameName`. The other sections read test bodies, and no
  `support/` folder holds a test.
- Hits that the script exempts. Copy the validator into the scratchpad, remove
  the exemption, and run the copy. Record the count, then leave them out of
  the class table: the script decides them.

If a section has 0 hits in all of history, also grep for the shape with a
pattern that does not depend on the validator. 0 from both means "not yet".
0 from the validator alone can mean a dead detector, and that is a
`writing-tests` ticket.

## One probe for misses

Write one scratch spec with the shape that the section names, in a form that
the detector can miss: a derived name, a template literal, a comment. If the
validator does not flag it, file the miss with the others in one ticket.
