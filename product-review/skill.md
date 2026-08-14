---
name: product-review
description: Assemble a panel of role-based reviewers for a question about a pull request or diff. Run panel.py to list every eligible role, then cut it to at most 5 whose posture, vantage point, and time horizon cover the question without overlap. Then report a focused findings table.
---

# Product Review

Select a panel of professional reviewers for a question about a change. Each role in `role-profiles/` defines a perspective: what it looks for, and what it suppresses. `pr-analysis` finds code-level patterns. `product-review` asks a different question: is the change ready to ship? The panel answers from the perspective of the people who live with the consequences.

---

## Panel selection

A panel is 1 to 5 roles. Their questions do not overlap, but all bear on the concern of the user. Coverage beats volume: three roles at different vantage points produce better findings than six roles at similar angles.

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

The work splits in two. `panel.py` says who **may** sit. You say who **does**.

- **The script** decides from the frontmatter alone. It is mechanical, and it returns the same answer every run.
- **You** decide from the diff. The script never reads the diff, so it cannot know which eligible role this change actually gives something to.

Decide two things first, which are yours to judge:

1. **The intent.** `readiness` asks whether the change can ship. `direction` asks where the change leads.
2. **The surfaces the diff touches.** Read the diff and name them.

Declare both. The script answers with every eligible role:

```bash
python3 "<base-dir>/panel.py" --intent readiness --surfaces contract,signals
```

```json
{
  "intent": "readiness",
  "surfaces": ["contract", "signals"],
  "practitioners": [
    {"role": "security", "question": "Does this introduce an exploitable surface?"},
    "... four more ..."
  ],
  "executives": [
    {"role": "executive:compliance", "question": "Does this breach a commitment we have already made?"},
    {"role": "executive:margin", "question": "What does this cost to run, and does it affect revenue correctly?"}
  ]
}
```

Seven eligible roles here. The panel will be smaller. Each entry carries the `question` of that role, so you can cut without opening a profile.

`--intent readiness` drops every generative role, so choose `direction` when the question asks where the change leads.

Then cut the list to the panel. Follow [`cutting.md`](cutting.md).

### Executives

Executives are not separated by the axes, because every executive reads the whole change. They differ in what they answer for. So `executive` is one role, named by accountability: `executive:margin` is the CFO seat, `executive:compliance` the General Counsel seat.

The `executives` list holds every accountability the surfaces reach, so there is nothing to seat one at a time. The count falls out of the diff rather than a fixed cap. A rename touches `pitch` and offers one executive. A change to billing, the public API, and module boundaries touches three surfaces and offers three.

To add a COO or a CRO, create `role-profiles/executive-<accountability>.md` with frontmatter. No code changes.

---

## Flags

- `--role=<name>` — run a single role. Seat that role alone and skip the cut entirely. Still run `panel.py` for the declared surfaces, and check that the named role appears in the response. If it does not, report that to the user rather than substituting another role. Never add a second role to fill out a panel.
- `--format=<format>` — `report` (default, markdown table) or `jsonl` (one finding per line, for CI pipelines).
- `--brief` — regenerate the product brief unconditionally, then continue with the review. See [`brief.md`](brief.md).

---

## Workflow

You never read a role profile, and you never review the diff yourself. Each seated role runs in its own subagent. You choose the panel, spawn them, and report what they return.

1. **Load the product brief.** Read `.product-review/brief.md` in the reviewed repository. If the file does not exist, ask the user before you generate one. Then follow [`brief.md`](brief.md). If the recorded commit SHA is stale relative to `HEAD`, say so in the run. A run without a brief still works. The roles cannot fire the suppression rules that need product context, so the panel over-reports.
2. **Name the diff.** Establish the range, such as `main...HEAD`. Run `git diff --stat <range>` and read enough of the change to name the surfaces it touches. Do not read the whole diff. The subagents do that. If no range is available, ask the user for the code to review.
3. **Select the roles.** Run `panel.py` per [Panel selection](#panel-selection), then cut the eligible list per [`cutting.md`](cutting.md).
4. **Spawn one subagent per seated role,** all in one message so they run in parallel. See [Spawning the roles](#spawning-the-roles).
5. **Collect the rows.** Each subagent returns JSONL, or nothing. Concatenate the lines in the order the subagents were spawned. Do not edit a row, and do not drop one because another role disagrees.
6. **Run `emit.py`.** Pipe the collected rows to it as JSONL. Report its stdout. See [Output format](#output-format).

### Spawning the roles

Give each subagent these five arguments and nothing else. It reads its own profile and its own diff.

| Argument | Value |
|---|---|
| `role` | The seat name, as `slug` or `slug:accountability` |
| `profile` | `<base-dir>/role-profiles/<file>.md` |
| `question` | The question the user asked, verbatim |
| `diff range` | The range from step 2, such as `main...HEAD` |
| `brief` | The path to `.product-review/brief.md`, or `none` |

Point each one at [`role-run.md`](role-run.md), which holds the evidence requirement, the suppression discipline, and the row schema. Do not restate those rules in the prompt you write.

Three rules on the spawn:

- **One role per subagent.** Two roles in one context can see each other, and the panel then reports one opinion twice.
- **Spawn them together.** They are independent, so they run at once.
- **Pass the range, never the diff text.** Five copies of a diff through this context is the cost the split exists to avoid.

If a subagent returns prose, a summary, or a wrapped array, discard the reply and spawn that role again. Do not repair the output by hand.

## Output format

Pipe the findings to `emit.py` as JSONL, one finding per line. Use the base directory shown at the top of this skill as `<base-dir>`. Report the stdout of the script as the whole reply.

```bash
python3 "<base-dir>/emit.py" --question "..." --role security=reason --role executive:margin=reason <<'EOF'
{"criticality":"Blocking","role":"security","posture":"defensive","observation":"...","reasoning":"..."}
EOF
```

The script validates every row and lists each violation. The row schema is in [`role-run.md`](role-run.md), which the subagents follow, so a rejection means a subagent broke its contract. Respawn that role. Never repair a row by hand, because the finding is then partly yours and attributed to the role.

Two checks belong to you rather than to a subagent, because no single role can see them:

- Every `role` is a seatable name and sits on the panel you cut.
- The panel is 1 to `MAX_PANEL` roles, read from `roles.py`.

The script sorts the rows, adds the no-findings row, and appends the run to `logs/YYYY-MM-DD.jsonl`. Add `--format jsonl` for a CI pipeline. A CI pipeline must treat `Opportunity` as informational. It must never fail a build.

Do not add prose, role sections, summaries, or recommendations. The table is the entire output. The user will ask follow-up questions for detail on any row.