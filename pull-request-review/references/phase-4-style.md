# Phase 4 — Style

Only flag style issues that affect readability or future maintainability. Skip formatting and whitespace — that's the linter's job. Group all style findings together at the bottom as nits; never intermix them with correctness issues.

## What to Check

- Are names accurate? A function named `getUser` that also creates users is a trap.
- Is complex logic explained by comments where the code can't speak for itself? Comments should explain *why*, not *what* — well-named identifiers already describe what.
- Is there duplicated logic that should reuse an existing function?
- Are magic numbers or strings extracted to named constants?
- Is dead code left in — commented-out blocks, unused variables, unreachable branches?
- In React: are hooks following the rules of hooks? Are effect dependencies correct and complete?

## What NOT to Flag

- Formatting, indentation, whitespace — delegate to the linter.
- Personal style preferences with no correctness or readability impact.
- Hypothetical future requirements unless there's a realistic near-term risk.
- Pre-existing issues the change didn't touch.

---

Style nits go last in the review. They should never crowd out or obscure Critical and High findings. If there are no significant issues above this phase, say so plainly rather than padding the review with minor observations.