# Phase 3 — Correctness

Work through the diff line by line. For each finding, assign a severity. Report Critical and High first — never bury a Critical under a pile of nits.

## Severity Levels

| Level | Meaning |
| --- | --- |
| **Critical** | Will cause a production incident or security breach — data loss, auth bypass, injection, crash in a hot path |
| **High** | Likely bug — off-by-one, race condition, wrong error handling, missing branch, N+1 query |
| **Medium** | Won't crash but is wrong or fragile — missed edge case, silent failure, misleading behavior |
| **Low** | Minor issue worth noting but not blocking |

## Logic

- Does the logic match the stated intent?
- Are all branches handled? Check: empty arrays, `null`/`undefined`, zero, negative numbers, empty strings.
- Do loops have correct bounds? Off-by-one errors in `<` vs `<=`, `slice`, index access.
- Are comparisons strict where they need to be? Is `NaN` handled where relevant?

## Async and Concurrency

- Are async operations awaited correctly?
- Is error handling present for every `async`/`await` and `Promise`?
- Are there race conditions — two paths that can interleave and corrupt shared state?

## Security

- Is user input validated before use? Never trust request bodies, query params, or headers.
- Are there SQL/NoSQL injection risks? Is input parameterized?
- Is sensitive data (tokens, passwords, PII) logged, stored in plaintext, or returned to clients?
- Are auth checks present and in the right place — before the operation, not after?
- Is there any use of `eval`, `Function()`, `innerHTML`, or `dangerouslySetInnerHTML` with dynamic content?
- Are secrets hardcoded or committed?

## Error Handling

- Are errors caught at the right level?
- Are errors re-thrown, swallowed, or returned in a way that hides failures from callers?
- Does the code fail loudly and early, or silently continue in a bad state?
- Are error messages informative without leaking internals?

## Performance

- Are there N+1 query patterns (query inside a loop)?
- Is heavy computation happening on every render or in a hot path without memoization?
- Are large data structures copied unnecessarily?

---

Be specific with every finding. "This could be a bug" is useless. "If `users` is empty, `users[0].id` throws" is actionable. Always explain what breaks if the issue stays unfixed.