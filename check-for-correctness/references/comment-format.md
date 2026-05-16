# Comment Format

Review comments are the user-facing output. They must be specific, actionable, and proportional to severity. The structured finding is the source of truth — the comment is just a derivation.

## Structure

```
{Severity}: {what may fail or is wrong and where}. {why it may fail or is incorrect}. {suggested action, often as a question}.
```

## Severity labels

- **`Blocking:`** — high confidence, the bug is demonstrable; the change should not merge until addressed.
- **`Suggested:`** — medium-to-high confidence; author should consider but may have context that makes it OK.
- **`Optional:`** — low-stakes improvement. Use sparingly; usually suppress instead.

Do not use bare statements without a label. The severity label tells the author whether they must act.

## Phrasing rules (all passes)

1. **Name the expression.** Quote it in backticks and cite the line number. The author should be able to find it without re-reading the diff.
2. **State the failure mode or incorrect behavior.** "may throw", "silently discarded", "is always true in this branch" — be concrete.
3. **Cite the evidence.** Mention the source operation, type, or sibling code that makes this suspicious.
4. **End with a question or suggestion**, not a command. The author may have context you don't.
5. **One concern per comment.** Post two comments for two distinct issues, even in the same function. Don't bundle.

## Length

Keep each comment to 2–4 sentences. If you find yourself writing a paragraph, the issue probably needs a design discussion, not a line comment.

---

## Pass-specific examples

### `null-access`

**Good:**

> **Blocking:** `user.name` on line 42 is read before `user` is checked. `users.find(...)` returns `undefined` when no match exists, and the guard at line 47 is unreachable. Could we move the guard above the access, or throw a `UserNotFoundError`?

> **Suggested:** `session.touch()` may throw because `sessions.get(sessionId)` returns `undefined` for unknown sessions. If the session is guaranteed to exist here, could we add an `assertExists` to make that contract explicit?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Type system clearly says nullable, no guard at all | Assert: "`x.y` will throw because `x` is undefined when ..." |
| Type system silenced via `!` or `as` | Ask: "Is `x` guaranteed non-null here? The `!` removes the type error but ..." |
| Source operation can return undefined but you can't see the contract | Ask: "Does `getUser(id)` always return a user, or can it return null?" |
| Guard exists but might not cover all branches | Ask: "Does the guard at line N cover the path through line M?" |

---

### `swallowed-exceptions`

**Good:**

> **Blocking:** The `catch` block at line 58 discards the exception from `writeFile()` without logging or re-throwing. Callers at line 72 proceed to read the file as if the write succeeded. Could we re-throw here, or return a `Result` type so callers can detect the failure?

> **Suggested:** `fetchUser(id).catch(() => {})` at line 34 silently resolves the promise to `undefined`. Any `.then()` consumer downstream will receive `undefined` for a user that failed to load. Should this propagate the rejection, or at least return a typed sentinel the caller can check?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Catch block is completely empty | Assert: "`catch (e) {}` at line N will silently hide any failure from `op()`..." |
| Catch logs but does not re-throw | Assert: "The `catch` logs but the caller has no way to detect the failure..." |
| Catch returns a default whose meaning is ambiguous | Ask: "Does the caller at line N distinguish a genuine empty result from a parse failure?" |
| Re-throw is missing the cause chain | Ask: "Should the original `e` be passed as `{ cause: e }` so the root cause is preserved?" |

---

### `suspicious-conditional`

**Good:**

> **Blocking:** `if (retries > MAX_RETRIES)` at line 37 runs one extra iteration — when `retries` equals `MAX_RETRIES` the condition is still false and the loop body executes again. `retryWithDelay` in the same file uses `>=` for the same invariant. Should this be `>= MAX_RETRIES`?

> **Suggested:** `if (isEnabled === "true")` at line 14 — `isEnabled` is typed as `boolean`, which is never the string `"true"`, so this branch can never execute. Did you mean `=== true`, or is `isEnabled` expected to be a string from an environment variable?

**When to ask vs. assert:**

| Situation | Phrasing |
|---|---|
| Condition is provably tautological given the type | Assert: "`if (count === null)` can never be true — `count` is `number`." |
| Off-by-one where boundary value is defined by a constant | Assert: "With `>`, the loop executes when `retries === MAX_RETRIES`, which exceeds the intended limit." |
| Duplicate condition in chain | Assert: "The branch at line N is dead — `status === 'active'` is already tested at line M." |
| Operator precedence where intent is unclear | Ask: "Is this `a || (b && c)` or `(a || b) && c`? The current form evaluates as the former." |
| Suspicious boundary where the correct value isn't obvious | Ask: "Should this be `>=` to include the boundary, or is `>` intentional here?" |

---

## Examples — bad (all passes)

> ❌ "This might be null." — vague, no location, no action.

> ❌ "Add error handling." — no rationale, no severity.

> ❌ "This condition looks wrong." — vague, no expression named, no failure mode.

> ❌ "**Blocking:** This is broken." — no explanation, no actionable fix.

> ❌ "**Suggested:** Why didn't you handle this?" — accusatory tone. Comment on the code, not the person.