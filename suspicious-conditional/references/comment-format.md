# Comment Format

Review comments are the user-facing output. They must be specific, actionable, and proportional to severity. The structured finding is the source of truth — the comment is just a derivation.

## Structure

```
{Severity}: {what the condition does vs. what it should do}. {why the current form is wrong or suspicious}. {suggested action, often as a question}.
```

## Severity labels

- **`Blocking:`** — high confidence, the logic error is demonstrable and the change should not merge until addressed.
- **`Suggested:`** — medium-to-high confidence, the condition looks wrong but the author may have context that makes it OK.
- **`Optional:`** — low-stakes style issue. Use sparingly; usually suppress instead.

Do not use bare statements without a label. The severity label tells the author whether they must act.

## Examples — good

> **Blocking:** `if (retries > MAX_RETRIES)` at line 37 runs one extra iteration — when `retries` equals `MAX_RETRIES` the condition is still false and the loop body executes again. `retryWithDelay` in the same file uses `>=` for the same invariant. Should this be `>= MAX_RETRIES`?

> **Blocking:** `else if (!isReady)` at line 52 is always true when the `else` branch executes, because the `if (isReady)` above already excluded the true case. This is equivalent to a plain `else`. Was the second condition meant to test a different variable?

> **Suggested:** `if (isEnabled === "true")` at line 14 — `isEnabled` is typed as `boolean`, which is never the string `"true"`, so this branch can never execute. Did you mean `=== true`, or is `isEnabled` expected to be a string from an environment variable?

> **Suggested:** `if (status === "active")` appears at both line 22 and line 31 in the same `if`/`else if` chain. The branch at line 31 is dead code — it can never be reached. Was the second condition meant to be a different status value?

## Examples — bad

> ❌ "This condition looks wrong." — vague, no location, no explanation.

> ❌ "Change `>` to `>=`." — command with no rationale; the author can't verify without re-reading the context.

> ❌ "**Blocking:** Logic error." — no expression named, no failure mode described.

> ❌ "**Optional:** Consider adding parentheses everywhere for clarity." — out of scope, not grounded in a specific bug.

> ❌ "**Suggested:** Did you mean to write this?" — accusatory without naming what looks wrong.

## Phrasing rules

1. **Name the expression.** Quote the condition in backticks and cite the line number. The author should be able to find it without re-reading the diff.
2. **State what it does vs. what it should do.** "runs one extra iteration", "is always true in this branch", "can never match a boolean value" — be concrete about the actual behavior.
3. **Cite the evidence.** Mention the type, the sibling code, or the boundary value that makes this suspicious.
4. **End with a question or suggestion**, not a command. The author may have context you don't — especially for off-by-one boundaries where the invariant may be intentional.
5. **One concern per comment.** If you see two distinct conditional issues in the same function, post two comments. Don't bundle.

## Length

Keep each comment to 2–4 sentences. If you find yourself writing a paragraph, the issue probably needs a design discussion, not a line comment.

## When to ask vs. assert

| Situation | Phrasing |
|---|---|
| Condition is provably tautological given the type | Assert: "`if (count === null)` can never be true — `count` is `number`." |
| Off-by-one where boundary value is defined by a constant | Assert: "With `>`, the loop executes when `retries === MAX_RETRIES`, which exceeds the intended limit." |
| Duplicate condition in chain | Assert: "The branch at line N is dead — `status === 'active'` is already tested at line M." |
| Operator precedence where intent is unclear | Ask: "Is this `a || (b && c)` or `(a || b) && c`? The current form evaluates as the former." |
| `else if` that negates the `if` | Ask: "Should this be a plain `else`, or was a different condition intended?" |
| Suspicious boundary where the correct value isn't obvious | Ask: "Should this be `>=` to include the boundary, or is `>` intentional here?" |