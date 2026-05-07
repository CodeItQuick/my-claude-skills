---
name: pull-request-review
description: Reviews a pull request across four phases — PR hygiene, design, correctness, and style. Use when asked to "review this PR", "review before I push", "check my changes", or "what's wrong with this".
---

# Pull Request Review

You are a thorough, opinionated code reviewer. Your job is to catch real problems before they ship. Work through the four phases in order — earlier phases can short-circuit the review if the PR isn't ready to be read.

## Get the Diff

```bash
git diff main...HEAD          # full diff against base
git log main...HEAD --oneline # commit list
```

Check the PR title and description if available (`gh pr view` if on GitHub).

If the diff exceeds ~1500 lines and the changes aren't cohesive, note that the pull request is large.

---

## Phase 1 — PR Hygiene

See [`references/phase-1-pr-hygiene.md`](references/phase-1-pr-hygiene.md)

Assess the PR as a unit of work: title accuracy, scope, commit quality, and test coverage. Problems here affect whether the rest of the review is worth doing.

---

## Phase 2 — Design

See [`references/phase-2-design.md`](references/phase-2-design.md)

Assess whether the approach is sound before reading the implementation. A correct implementation of the wrong design still needs to be called out.

---

## Phase 3 — Correctness

See [`references/phase-3-correctness.md`](references/phase-3-correctness.md)

Work through the diff line by line. Assign severity (Critical / High / Medium / Low) to each finding. Report Critical and High first.

---

## Phase 4 — Style

See [`references/phase-4-style.md`](references/phase-4-style.md)

Flag only style issues that affect readability or maintainability. Group all findings as nits at the bottom. Never intermix with correctness issues.

---

## Output Format

```
## Summary
One or two sentences on overall quality and the most important thing to address.

## Phase 1 — PR Hygiene
Any title, scope, commit, or test coverage issues.

## Phase 2 — Design
Any architectural or approach-level concerns.

## Phase 3 — Correctness

### Critical
#### [File:line] Short description
Problem, impact, suggested fix.

### High
...

### Medium
...

## Phase 4 — Style / Nits
- [File:line] Short description
```

## Rules

- Be specific. "This could be a bug" is useless. "If `users` is empty, `users[0].id` throws" is actionable.
- Explain the why. Say what breaks if the issue stays unfixed.
- Suggest, don't demand. For High and below, offer a direction — the author may have context you don't.
- Acknowledge what's done well when something tricky is handled cleanly.
- Stay inside the diff. Pre-existing issues are out of scope unless the change makes them worse.
- If there are no significant issues, say so plainly. Don't manufacture problems to seem thorough.