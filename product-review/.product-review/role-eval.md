# Evaluating a role profile change

A procedure for deciding whether an edit to one role profile makes the review
better. Run it whenever you rewrite a profile and are not sure the new version
is an improvement.

It evaluates **role profiles only**. Not `skill.md`, not `cutting.md`, not
`role-run.md`, and not the scripts. Those change what every role does at once,
and a two-run comparison cannot attribute the difference.

Each variant runs the whole product-review workflow, seating only the one role
under test. The grading is blind: you rate the differences before you learn
which variant produced them.

## What you need before you start

| Input | Rule |
|---|---|
| `role` | One seat name. One role per evaluation, never two. |
| `baseline` | The committed profile at `role-profiles/<role>.md`, unmodified |
| `candidate` | The rewrite, at `.product-review/candidates/<role>-<label>.md` |
| `question` | One question, used verbatim for both variants |
| `scope` | One path or range, identical for both variants |

**Keep the candidate out of `role-profiles/`.** `roles.load_roles` reads every
`.md` file in that directory, so a candidate carrying the same `role:` key
would collide with its own baseline, and the evaluation would compare one
profile against itself.

## Steps

1. **Fix the controls.** Same question, same scope, same brief, same model.
   The profile path is the only difference between the two runs.
2. **Assign A and B at random.** Decide by coin flip which variant is A. Write
   the mapping nowhere the user will read it before step 7.
3. **Run the whole skill once per variant.** Follow the product-review
   workflow in `skill.md` end to end — load the brief, name the scope, run
   `panel.py` — but seat only the role under test, as the `--role=<name>` flag
   does. Substitute the variant's profile path in the spawn arguments. Do not
   cut, and do not add a second role.
4. **Report both tables.** Each run ends at `emit.py`, so each produces one
   findings table. Label them A and B.
5. **Pair the findings.** Match an A finding to a B finding when both name the
   same artifact and the same defect. Wording will differ. Do not pair two
   findings that merely cite the same file.
6. **Build the difference table** and stop. Every unpaired finding is a
   difference. A paired finding is not, however differently it is worded.
   Wait for the ratings before writing anything else.
7. **Reveal the mapping** once every difference carries a rating, and not
   before.
8. **Record the result** in `.product-review/evals/<role>-<date>.md`, using
   the scorecard below, and decide.

## Blind grading

The point of the blind is that a rating should follow from the finding, not
from knowing which prompt you hoped would win.

While the user is grading:

- Label everything A and B. Never "candidate", "new", "old", or "baseline".
- Sort the difference table by the finding text, so the sides interleave. Do
  not group by side, and do not put one side first.
- Say nothing about the findings. No summary, no count per side, no view on
  which set reads better.
- If asked which is which, say the mapping comes after the ratings.

A caveat you cannot design away: a rewritten profile often produces findings
in a recognisable shape. If the user can tell the sides apart from the rows,
the blind has failed, and the result is weaker. Say so rather than pretending
otherwise.

## The difference table

| # | Side | Finding | Rating |
|---|---|---|---|
| 1 | A | *one line* | |
| 2 | B | *one line* | |

Leave the rating column empty. The user fills it in with one of these four
values and no others:

- **valid and useful** — true, and it changes what you would do
- **valid but unimportant** — true, and it changes nothing
- **incorrect or speculative** — untrue, or unsupported by the scope
- **duplicate of another finding** — already said by another row

Do not rate your own output, and do not argue with a rating.

## The decision rule

Adopt the candidate when it gains at least one **valid and useful** finding
and loses none.

Reject it when it gains an **incorrect or speculative** finding, whatever else
it gains. A profile that invents findings costs more than one that misses
them, because every false row has to be read and dismissed by a person.

Everything else is a judgment call. Record the call and the reason.

## One pass, and what that costs

Run each variant once. Do not re-run to confirm a result.

Know what that buys and what it does not. Two runs of the same profile do not
return the same rows, so some part of every difference is run-to-run noise
rather than the edit. One pass cannot separate the two.

So treat the outcome as a judgment on the rows in front of you, not as a
measurement. A profile that gains three useful findings is worth adopting on
one pass. A profile that gains one is a coin flip you are choosing to call.

Record "no effect" when the difference table is empty, or when every
difference rates as unimportant or duplicate on both sides.

## The scorecard

```markdown
# <role> — <label> vs baseline

- **Date:** <YYYY-MM-DD>
- **Question:** <verbatim>
- **Scope:** <path or range>
- **Blind held:** yes / no

| Rating | Candidate only | Baseline only |
|---|---|---|
| valid and useful | | |
| valid but unimportant | | |
| incorrect or speculative | | |
| duplicate of another finding | | |

**Decision:** adopt / reject / no effect

**Reason:** one sentence.

**What the edit was:** one sentence, so a later reader can tell what was tested.
```

Keep every scorecard. A rejected edit is worth as much as an adopted one — it
records something the profile does not need, and stops the same idea being
tried twice.