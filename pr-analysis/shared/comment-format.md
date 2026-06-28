# Comment Format

Review comments are the user-facing output. They must be specific, actionable, and proportional to severity. The structured finding is the source of truth — the comment is just a derivation.

## Structure

```
{Severity}: {what may fail or is wrong and where}. {why it may fail or is incorrect}. {suggested action, often as a question}.
```

## Severity labels

- **`Blocking:`** — high confidence, the bug is demonstrable; the change should not merge until addressed.
- **`Suggested:`** — high confidence but not demonstrably broken; author should consider but may have context that makes it OK.
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

## Examples — bad (all passes)

> ❌ "This might be null." — vague, no location, no action.

> ❌ "Add error handling." — no rationale, no severity.

> ❌ "This condition looks wrong." — vague, no expression named, no failure mode.

> ❌ "**Blocking:** This is broken." — no explanation, no actionable fix.

> ❌ "**Suggested:** Why didn't you handle this?" — accusatory tone. Comment on the code, not the person.