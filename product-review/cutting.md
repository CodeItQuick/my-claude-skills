# Cutting the eligible list to a panel

`panel.py` returns every role that may sit. This file says how to choose the
ones that do. Read it at step 3 of the workflow, after the script has run and
before you open any profile.

Cut on relevance, not on count. A panel of three roles that each have
something to say beats a panel of five where two have nothing. Five is a cap
you may not exceed, never a target to fill.

## The relevance test

For each eligible role, name the artifact in the diff that its `question` can
be asked of. If you cannot name one, cut the role.

The response carries the `question` of every eligible role, so run this test
without opening a profile.

## The rules

Apply these in order. Stop when no rule fires.

1. **Never cut a role the user named.** If a named role is absent from the
   eligible list, report that instead of substituting another role.
2. **Cut every role whose question the diff does not answer.** State the
   reason for each cut.
3. **Keep at least one practitioner per declared surface.** If relevance
   empties a surface, you declared the wrong surfaces. Say so rather than
   seating a role with nothing to read.
4. **If still over five, cut practitioners whose horizon does not match the
   intent.** `readiness` keeps `now`. `direction` keeps `later`.
5. **If still over five, cut a practitioner whose vantage duplicates one
   already kept on the same surface.**
6. **Cut an executive last.** Cut the accountability whose surface the
   question says least about.

Rule 2 can drop the role that had the only finding, and nothing later recovers
it. So write the reason for every cut, and keep the role when the reason will
not come.

## What the script does not check

The script filters by surface and by posture. Nothing else. These four rules
are yours to hold:

- **At least one practitioner sits on every panel.** An all-executive panel
  cannot cite the diff.
- **`platform-capability-scout` and `toolsmith` never run together.** The
  audience of the Scout is code. The audience of the Toolsmith is a person.
- **Seat each accountability once.** The response never repeats one, so this
  matters only if you edit the list by hand.
- **At most one accountability without a surface.** Only `identity` qualifies
  today, and it appears only under `--intent direction`.

## A worked cut

The question:

> "The `/v1/exports` endpoint now requires a new OAuth scope, drops two fields
> from the response, and runs behind a per-account metered rate limiter. Can
> this ship?"

That is `--intent readiness --surfaces contract,signals`, and the script
returns seven eligible roles. Rule 2 alone settles it:

| Role | Rule 2 | Outcome |
|---|---|---|
| `security` | The new scope is an attack surface | Keep |
| `integration-partner` | The dropped fields break callers | Keep |
| `site-reliability-engineer` | The limiter emits counters | Keep |
| `developer-advocate` | No docs, examples, or SDK in the diff | **Cut** |
| `platform-devex` | A product endpoint, not platform machinery | **Cut** |
| `executive:compliance` | A scope change touches a published commitment | Keep |
| `executive:margin` | Metered usage is a cost and revenue signal | Keep |

Five roles, and rules 3 to 6 never fire.

## A cut under the cap

`--intent readiness --surfaces words` returns four eligible roles for five
seats, so no rule of the cap fires. Rule 2 still does.

On a diff that rewrites error strings, `ai-prompt-engineer` reads `words` but
asks *"Is this prompt a reliable spec?"*, and the diff holds no prompt. Cut it.
The panel is `support`, `technical-writer`, and `executive:brand`.

Four eligible roles do not make a panel of four. Relevance decides the size.