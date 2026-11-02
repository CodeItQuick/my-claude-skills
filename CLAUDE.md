## Commit Messages

Use Arlo's Commit Notation. Every commit summary starts with a risk level, a
space, a change type, then the summary:

```
^ F Add per-question countdown timer
. r Extract questioner factory from game.ts
! B Fix accuracyRate contract mismatch
```

**Risk level** — the first character:

| Code | Level | Meaning |
|------|-------|---------|
| `.` | (Proven) Safe | Addresses all known and unknown risks |
| `^` | Validated | Addresses all known risks |
| `!` | Risky | Some known risks remain unverified |
| `@` | (Probably) Broken | No risk attestation |

**Change type** — the second character. Uppercase means the change alters
program behavior; lowercase means it does not.

| Code | Type |
|------|------|
| `F` / `f` | Feature — change or extend one aspect of behavior, altering no others |
| `B` / `b` | Bugfix — repair one undesirable behavior, altering no others |
| `R` / `r` | Refactoring — change implementation, not behavior |
| `D` / `d` | Documentation — communicates to the team, no behavior impact |
| `m` | Merge — risk is the max of any commit in the branch |
| `t` | Test-only — alter tests without altering behavior |
| `e` | Environment — tooling, config, linting; no program behavior |
| `a` | Auto — formatting or code generation |
| `c` | Comment — comments only |
| `C` | Content — user-visible copy |
| `p` | Process — team process or working agreement |
| `s` | Spec — spec or design documents |
| `n` | NOP — empty commit |
| `@` | Unknown or multiple — usually written `@ @` |

**The 8-line rule:** a feature or bugfix touching more than 8 lines, tests
included, cannot claim `.` or `^`. Split the commit rather than downgrade the
claim. This is the rule that does the work — it forces small commits.

The template in `.gitmessage` carries this cheat sheet and is registered via
`git config --local commit.template`.

## NOW.md

`NOW.md` at the repo root holds the big picture: the goal, what is next, what
comes after, what is on the radar, and what is deliberately not being done. A
`UserPromptSubmit` hook in `.claude/settings.json` injects it into every prompt,
so it is always in context.

**On the radar** is for tickets that are not scheduled but should be pulled
forward when a condition is met, and it names that condition. It is not a
wishlist: an entry with no trigger belongs in `jira.md` and nowhere else.

It deliberately does not track what is in flight. That field needs updating
twice per task to stay true, and the session already knows what it is doing.

**Keep it current.** When a step in it is finished, abandoned, or superseded,
update the file as part of that same task — not as a separate chore, and without
being asked. A `NOW.md` nobody updates is worse than none, because it asserts
something false.

- Ten lines maximum. It is a pointer, not a plan.
- Reasoning belongs in `docs/notes/`, not here. Link, do not inline.
- The user may edit it directly or redirect it in a prompt; either overrides
  what is written there.
- Do not record history in it. A finished step is deleted, not struck through.

### The backlog moves with it

`NOW.md` says what is being worked on; `jira.md` says what is owed. They drift
apart in opposite directions, so two things happen at fixed moments.

**When a step finishes**, in the same edit that updates `NOW.md`:

```bash
node .claude/skills/maintaining-the-backlog/scripts/validate-backlog.mjs
```

Then mark the finished ticket done, in both the heading and the summary table,
with a `**Shipped:**` note saying what landed. This is mechanical, takes a
second, and is not optional.

**When something is discovered mid-task, file it then, not at the end.** A
defect, a missing capability, or a gap in a skill gets a ticket at the moment
you find it, while you can still say what found it and what it costs. QUIZ-051
is worth acting on only because it records that a Likert quiz skipping one line
renders blank, and that building QUIZ-025 is what surfaced it. Written an hour
later it would have read as a preference.

Filing is not fixing. The ticket exists so the fix gets its own diff.

Use `maintaining-the-backlog` for both. Do not run the full skill at every step
boundary just to check — a review that usually reports nothing stops being run.
