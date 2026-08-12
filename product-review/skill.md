---
name: product-review
description: Assemble a panel of role-based reviewers for a question about a pull request or diff. Select 2–4 roles from role-profiles/ whose posture, vantage point, and time horizon cover the question without overlap. Then report a focused findings table.
---

# Product Review

Select a panel of professional reviewers for a question about a change. Each role in `role-profiles/` defines a perspective: what it looks for, and what it suppresses. `pr-analysis` finds code-level patterns. `product-review` asks a different question: is the change ready to ship? The panel answers from the perspective of the people who live with the consequences.

---

## Panel selection

A panel is 2–4 roles. Their questions do not overlap, but all bear on the concern of the user. Coverage beats volume: three roles at different vantage points produce better findings than six roles at similar angles.

Each role carries four axes in its profile frontmatter:

- **Posture** — **defensive** reads the diff for what must not ship. **generative** reads it for what must exist next.
- **Vantage** — **internal** sees the code. **external** sees the product from outside. **strategic** weighs the change against a company constraint.
- **Horizon** — when the consequence lands: **now** at ship, **soon** in use and operation, **later** as foundation and direction.
- **Surface** — the artifact the role reads. Two roles reading different artifacts cannot produce the same finding.

| Surface | What the role reads |
|---|---|
| `contract` | signatures, schemas, payload shapes, error codes, permissions |
| `behavior` | the values that come out and the state left behind |
| `flow` | the ordered steps of a first or unfamiliar run |
| `habit` | the steps an established user already has in muscle memory |
| `words` | instructional text: docs, labels, error messages, prompts |
| `pitch` | persuasive text: positioning, claims, competitive framing |
| `signals` | what the running system emits: logs, metrics, alerts, cost |
| `structure` | module boundaries, dependencies, layering |

### Choosing the panel

Run `panel.py --list` to see every role by square and surface. Then decide two things, which are yours to judge:

1. **The intent.** `readiness` asks whether the change can ship. `direction` asks where the change leads.
2. **The surfaces the diff touches.** Read the diff and name them.

Declare both, propose the roles, and let the script hold you to the consequences:

```bash
python3 "<base-dir>/panel.py" --intent readiness --surfaces contract,signals \
    --role qa-sdet --role executive:margin
```

The script prints the profiles to read, or rejects the panel and lists every violation. If it rejects the panel, correct the roles and run it again. Do not read a profile before the panel is accepted.

Never add or swap a role the user named explicitly. If a user-named role cannot be seated, report the rejection instead. Correcting a panel means changing roles you chose yourself.

### What the script enforces

- The panel is 2 to 4 roles.
- No two roles match on **all four** axes. Two roles that share a square but read different surfaces are complementary, as `trial-user` and `power-user` do.
- At least one practitioner sits on every panel. An all-executive panel cannot cite the diff.
- Generative roles need `--intent direction`. The one exception is `launch-editor`, whose findings expire at release rather than becoming a backlog.
- At most two generative roles, and never more generative than defensive.
- `platform-capability-scout` and `toolsmith` never run together. The audience of the Scout is code. The audience of the Toolsmith is a person.

### Executives

Executives are not separated by the axes, because every executive reads the whole change. They differ in what they answer for. So `executive` is one role, seated by accountability:

```bash
--role executive:margin      # the CFO seat
--role executive:compliance  # the General Counsel seat
```

**An executive is seated only when the diff contains the surface their accountability reads.** The count then falls out of the diff rather than a fixed cap. A rename touches `pitch` and seats one executive. A change to billing, the public API, and module boundaries touches three surfaces and seats three.

`identity` is the exception: it reads no surface, so it can never be justified by the diff. It needs `--intent direction`, and only one surfaceless accountability may sit on a panel.

To add a COO or a CRO, create `role-profiles/executive-<accountability>.md` with frontmatter. No code changes.

---

## Flags

- `--role=<name>` — run a single role. Pass `<name>` to `panel.py` with `--single`, which resolves aliases from the profiles. For example, `qa` resolves to `qa-sdet`, `revops` to `revenue-operations-analyst`, and `cfo` to `executive:margin`. Never add a second role to satisfy the panel floor. If the named role cannot be seated, report the rejection to the user rather than substituting another role.
- `--format=<format>` — `report` (default, markdown table) or `jsonl` (one finding per line, for CI pipelines).
- `--brief` — regenerate the product brief unconditionally, then continue with the review. See [`brief.md`](brief.md).

---

## Workflow

1. **Load the product brief.** Read `.product-review/brief.md` in the reviewed repository. If the file does not exist, ask the user before you generate one. Then follow [`brief.md`](brief.md). If the recorded commit SHA is stale relative to `HEAD`, say so in the run. A run without a brief still works. The roles cannot fire the suppression rules that need product context, so the panel over-reports.
2. **Get the diff.** Run `git diff <base>...HEAD`. Review only the code that is visible in the diff. If no diff is available, ask the user for the code to review.
3. **Select the roles.** Run `panel.py` per [Panel selection](#panel-selection). For `--role=<name>`, add `--single`. Read a profile only after the script accepts the panel.
4. **Run each role independently.** Read the profile of the role. Examine the diff through that lens alone. The findings of one role do not influence another.
5. **Check the evidence.** Each finding needs at least two evidence types. If in doubt, suppress the finding.
6. **Run `emit.py`.** Pipe the findings to it as JSONL. Report its stdout. See [Output format](#output-format).

## Evidence requirement

Each finding needs at least two of these evidence types:

- **Code evidence** — a specific line or expression in the diff that shows the concern
- **Path evidence** — a reachable code path that triggers the problem
- **Convention evidence** — nearby or sibling code that establishes the pattern this violates
- **Impact evidence** — what goes wrong for a user or an operator if this ships (defensive roles only)
- **Leverage evidence** — a construct in the diff, the capability it puts within reach, and why that capability is much cheaper to build now (generative roles only)

Code, path, and convention evidence are open to both postures. Impact evidence and leverage evidence each belong to one posture.

### The product brief is context, never evidence

The brief (see [`brief.md`](brief.md)) supplies facts that a diff cannot: who the users are, whether the product bills anyone, what data the product holds. The brief changes what a role treats as relevant. It does not change what a role can prove.

- A brief fact can **suppress** a finding on its own. "No billing code present" is enough to silence the Revenue Operations Analyst.
- A brief fact can **never support** a finding. Every reported finding still needs two evidence types from the diff.
- The **Inferred** lines of the brief carry less weight. They can frame the reasoning of a finding. Suppress a finding that rests only on them. Always phrase a named-competitor claim as a claim to check.
- The **Unknowns** of the brief mean *unknown*, not *absent*. If a role needs one of those facts to make its case, suppress the finding. Do not assume a value.

## Confidence calibration

Report only `high`-confidence findings. Suppress `medium` and `low`, and never report them. The soft-suppression rules in a profile downgrade confidence to `medium`.

## Output format

Pipe the findings to `emit.py` as JSONL, one finding per line. Use the base directory shown at the top of this skill as `<base-dir>`. Report the stdout of the script as the whole reply.

```bash
python3 "<base-dir>/emit.py" --question "..." --role security=reason --role executive:margin=reason <<'EOF'
{"criticality":"Blocking","role":"security","posture":"defensive","observation":"...","reasoning":"..."}
EOF
```

The criticality of a finding follows from the posture of the role:

| Value | Meaning |
|---|---|
| `Blocking` | The change must not ship as-is. Defensive roles only. |
| `Suggested` | The change can ship. The problem is still worth a fix. Defensive roles only. |
| `Opportunity` | Nothing is wrong. This names leverage that the change created. Generative roles only, and never a reason to hold a ship. |

The script rejects the run and lists every violation when a rule fails:

- `criticality` is `Blocking`, `Suggested`, or `Opportunity`
- the posture matches the criticality, per the table above
- every `role` is a seatable name and sits on the panel that `panel.py` accepted
- the panel is 1 to 4 roles, since `emit.py` cannot see `--single` and lets `panel.py` hold the floor of 2
- `observation` and `reasoning` are each one sentence, on one line, without a `|`

If the run is rejected, correct the findings and run the script again.

The script sorts the rows, adds the no-findings row, and appends the run to `logs/YYYY-MM-DD.jsonl`. Add `--format jsonl` for a CI pipeline. A CI pipeline must treat `Opportunity` as informational. It must never fail a build.

Do not add prose, role sections, summaries, or recommendations. The table is the entire output. The user will ask follow-up questions for detail on any row.