# ai-prompt-engineer — prior-revision vs baseline

- **Date:** 2026-08-15
- **Question:** is it ready to ship?
- **Scope:** `product-review/`
- **Blind held:** yes, after a re-flip. The first assignment leaked when the
  variants' word counts were printed. A and B were reassigned from a fresh
  seed and nothing distinguishing was printed after that.
- **Rows returned:** candidate 6, baseline 5
- **Paired findings:** 2 — both sides named the same defect
- **Overlap:** 2 of 11

| Rating | Candidate only | Baseline only |
|---|---|---|
| valid and useful | 4 | 2 |
| valid but unimportant | 0 | 1 |
| incorrect or speculative | 0 | 0 |
| duplicate of another finding | 0 | 0 |

The two pairs, excluded from the difference table:

- The investment-tier prefix required by every generative profile against the
  one-sentence rule that `emit.py` enforces.
- `skill.md:96` forbidding all prose around the table, against four other
  instructions that require prose in the run.

**Decision:** no adopt, no revert — judgment call.

**Reason:** The candidate gained four useful findings and lost two, so it beat
the baseline on yield but failed the adopt rule, which requires losing none.

**What the edit was:** Commit `ca6e88a` collapsed six concern categories into
five, merging "Context window and signal density" with "Suppression and
constraint fatigue", and tightened the prose from 1,191 words to 1,053. This
evaluation ran the pre-`ca6e88a` body as the candidate, carrying the current
frontmatter unchanged, to ask whether that revision improved the review.

## What the result does and does not say

Overlap was low: 2 pairs out of 11 rows. The two profiles were largely looking
at different things, so the edit was substantial rather than incremental, and
more of the difference could be run-to-run variance than a high-overlap result
would allow.

It says the shorter profile did not find more. On one pass, at the same
question and scope, the older six-category profile produced twice as many
findings rated useful, and neither side produced anything false.

It does not say which part of the edit cost the yield. Most of the candidate's
extra findings are instruction conflicts, which category 1 covers in both
versions — not the two categories the revision merged. One pass cannot
attribute the difference to a specific change.

The baseline's two unique findings are real and would be lost by reverting:
that no worked finding row exists anywhere in the prompt set, and that
`skill.md:56` tells the orchestrator both to read enough to name the surfaces
and not to read the files.