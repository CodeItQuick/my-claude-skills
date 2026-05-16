# Comment Format

Review comments are the user-facing output. They must be specific, actionable, and proportional to severity. The structured finding is the source of truth — the comment is just a derivation.

## Structure

```
{Severity}: {what is caught and where}. {why swallowing is harmful here}. {suggested action, often as a question}.
```

## Severity label

All reported findings use a single label:

- **`Suggested:`** — high confidence finding, author should address before merging but may have context that makes it OK.

Do not use bare statements without the label. The label tells the author a finding was deliberate, not accidental.

## Examples — good

> **Suggested:** The `catch` block at line 58 discards the exception from `writeFile()` without logging or re-throwing. Callers at line 72 proceed to read the file as if the write succeeded. Could we re-throw here, or return a `Result` type so callers can detect the failure?

> **Suggested:** `fetchUser(id).catch(() => {})` at line 34 silently resolves the promise to `undefined`. Any `.then()` consumer downstream will receive `undefined` for a user that failed to load. Should this propagate the rejection, or at least return a typed sentinel the caller can check?

> **Suggested:** The `catch` at line 91 throws a new `Error("Config failed")` without passing `{ cause: e }`. The original message and stack trace are lost, which makes debugging harder. Worth adding `{ cause: e }` to the replacement error?

## Examples — bad

> ❌ "This catch is empty." — vague, no location, no action.

> ❌ "Add error handling." — no rationale, no severity.

> ❌ "**Suggested:** Why didn't you handle this?" — accusatory tone. Comment on the code, not the person.

## Phrasing rules

1. **Name the catch site.** Quote the catch expression or the call that may throw in backticks, and cite the line number. The author should be able to find it without re-reading the diff.
2. **State the downstream consequence.** "caller proceeds as if the write succeeded", "promise resolves to undefined", "stack trace is lost" — make clear what *actually goes wrong*, not just that an exception is caught.
3. **Cite the evidence.** Mention what the failing operation is (`writeFile`, `JSON.parse`, `db.insert`) so the author can verify quickly.
4. **End with a question or suggestion**, not a command. The author may have context you don't.
5. **One concern per comment.** If you see two distinct swallowed-exception sites in the same function, post two comments. Don't bundle.

## Length

Keep each comment to 2–4 sentences. If you find yourself writing a paragraph, the issue probably needs a design discussion, not a line comment.

## When to ask vs. assert

| Situation | Phrasing |
|---|---|
| Catch block is completely empty | Assert: "`catch (e) {}` at line N will silently hide any failure from `op()`..." |
| Catch logs but does not re-throw | Assert: "The `catch` logs but the caller has no way to detect the failure..." |
| Catch returns a default whose meaning is ambiguous | Ask: "Does the caller at line N distinguish a genuine empty result from a `JSON.parse` failure?" |
| Catch swallows inside a retry loop | Ask: "Does the retry at line N re-throw on the final attempt, or could it silently succeed with a bad state?" |
| Catch re-throws without cause chain | Ask: "Should the original `e` be passed as `{ cause: e }` so the root cause is preserved?" |