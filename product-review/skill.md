---
name: product-review
description: Assemble a panel of role-based reviewers for a question about a project, a section of one, or a pull request. Run panel.py to list every eligible role, cut it to the roles the scope actually gives something to, run each one, and report a focused findings table.
---

# Product Review

Assemble a panel of role-based reviewers for a question about a project, a section of one, or a change, and report what they find. `pr-analysis` finds code-level patterns. `product-review` asks whether what is in scope is ready to ship.

---

## Panel selection

Name two things. Both are yours to judge.

**The intent.** `readiness` asks whether the change can ship. `direction` asks where the change leads. A question is one or the other, never both, and posture follows from that classification absolutely: a `readiness` response contains no generative role, whatever the surfaces.

**The surfaces the scope carries.** Each role reads one artifact, named here:

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

Pass both to the script. It returns every eligible role, as `practitioners` and `executives`, each with the `question` that role asks:

```bash
python3 "<base-dir>/panel.py" --intent readiness --surfaces contract,signals
```

Then cut that list to the panel. Follow [`cutting.md`](cutting.md).

---

## Flags

- `--role=<name>` — run a single role. `<name>` is the exact seat name, as `slug` or `slug:accountability`. There are no aliases and no shorthand. Seat that role alone and skip the cut entirely. Still run `panel.py` for the declared surfaces, and check that the named role appears in the response. Never add a second role to fill out a panel, and never substitute another role. If the named role is absent, say which of the two causes applies:
  - **It is generative and the intent is `readiness`.** The user asked a direction question. Tell them so, and offer to run it again with `--intent direction`.
  - **Its surface is not among the surfaces you declared.** That is your call from step 2, not theirs. Look again in the scope for that surface. Declare it and run again if it is there, and tell the user the scope does not carry it if it is not.
- `--format=<format>` — `report` (default, markdown table) or `jsonl` (one finding per line, for CI pipelines).
- `--brief` — regenerate the product brief unconditionally, then continue with the review. See [`brief.md`](brief.md).

---

## Workflow

You never read a role profile, and you never review the scope yourself. Each seated role runs in its own subagent. You choose the panel, spawn them, and report what they return.

1. **Load the product brief.** Read `.product-review/brief.md` in the reviewed repository. If the file does not exist, ask the user before you generate one. Then follow [`brief.md`](brief.md). If the recorded commit SHA is stale relative to `HEAD`, say so in the run. A run without a brief still works. The roles cannot fire the suppression rules that need product context, so the panel over-reports.
2. **Name the scope.** Establish the path or paths under review — usually a project folder, or one section of it. Use a git range such as `main...HEAD` only when the question is about one specific change. List the tree and read enough to name the surfaces present. Do not read the files themselves. The subagents do that. If the user named no target, ask what to review.
3. **Select the roles.** Run `panel.py` per [Panel selection](#panel-selection), then cut the eligible list per [`cutting.md`](cutting.md).
4. **Spawn one subagent per seated role,** all in one message so they run in parallel. See [Spawning the roles](#spawning-the-roles).
5. **Collect the rows.** Each subagent returns JSONL, or nothing. Concatenate the lines in the order the subagents were spawned. Do not edit a row, and do not drop one because another role disagrees.
6. **Run `emit.py`.** Pipe the collected rows to it as JSONL. Report its stdout. See [Output format](#output-format).

### Spawning the roles

Give each subagent these five arguments and nothing else. It reads its own profile and its own scope.

| Argument | Value |
|---|---|
| `role` | The seat name, as `slug` or `slug:accountability` |
| `profile` | `<base-dir>/role-profiles/<file>.md` |
| `question` | The question the user asked, verbatim |
| `scope` | The path or paths from step 2, or a git range when the question is about one change |
| `brief` | The path to `.product-review/brief.md`, or `none` |

Point each one at [`role-run.md`](role-run.md), which holds the evidence requirement, the suppression discipline, and the row schema. Do not restate those rules in the prompt you write.

Three rules on the spawn:

- **One role per subagent.** Two roles in one context can see each other, and the panel then reports one opinion twice.
- **Spawn them together.** They are independent, so they run at once.
- **Pass the scope, never the contents.** Five copies of a project through this context is the cost the split exists to avoid.

If a subagent returns prose, a summary, or a wrapped array, discard the reply and spawn that role again. Do not repair the output by hand.

## Output format

Run `emit.py` with the question, one `--role name=reason` per seat, and the collected rows on stdin. Add `--format jsonl` when the user passed that flag.

```bash
python3 "<base-dir>/emit.py" --question "..." --role security=reason --role executive:margin=reason <<'EOF'
{"criticality":"Blocking","role":"security","posture":"defensive","observation":"...","reasoning":"..."}
EOF
```

The script validates every row and rejects the run with a list of violations. Respawn the role that broke its contract. Never repair a row by hand.

Report its stdout as the whole reply. Add no prose, sections, summary, or recommendation. The table is the entire output.