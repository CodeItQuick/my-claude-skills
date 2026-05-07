# Phase 1 — PR Hygiene

Before reading a single line of code, assess the PR as a unit of work.

## Title and Description

- Does the title accurately describe what changed? A title like "fix bug" or "updates" is a red flag.
- Does the description explain *why* the change was made, not just what?
- If there's a linked issue or ticket, does the change actually address it?

## Scope

- Is this PR doing one thing, or several unrelated things bundled together?
- Are there too many lines changed to review meaningfully in one pass? Flag this if the diff exceeds ~500 lines and the changes aren't cohesive.
- Are there unrelated files in the diff (reformatting, unrelated refactors, debug code left in)?

## Commits

- Do the commit messages describe the intent of each change?
- Are there commits that suggest the work went sideways and was patched over (e.g., "fix fix", "revert revert", "wip")?

## Tests and Coverage

- Are there tests for the new behavior?
- If a bug was fixed, is there a regression test?
- Do existing tests still cover the changed behavior, or do they need updating?

---

Report scope and title problems here — they affect whether the rest of the review is even worth doing. A PR that's too large, mislabeled, or missing tests is a problem regardless of how clean the code is.