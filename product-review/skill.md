---
name: product-review
description: Assemble a panel of role-based reviewers for a question about a pull request or diff. Select 2–4 roles from role-profiles/ whose posture, vantage point, and time horizon cover the question without overlap. Then report a focused findings table.
---

# Product Review

Select a panel of professional reviewers for a question about a change. Each role in `role-profiles/` defines a perspective: what it looks for, and what it suppresses. `pr-analysis` finds code-level patterns. `product-review` asks a different question: is the change ready to ship? The panel answers from the perspective of the people who live with the consequences.

---

## Panel selection

A panel is 2–4 roles. Their questions do not overlap, but all bear on the concern of the user. Coverage beats volume: three roles at different vantage points produce better findings than six roles at similar angles. Spread the panel across three axes:

- **Posture** — **Defensive** reads the diff for what must not ship. **Generative** reads it for what must exist next.
- **Vantage point** — **Internal** sees the code. **External** sees the product from outside. **Strategic** asks whether this is the right product at all.
- **Time horizon** — when the consequence lands: **Now** at ship, **Soon** in use and operation, **Later** as foundation and direction.

To pick a panel:

1. Identify whether the question is about correctness, user experience, business, or strategy.
2. Choose roles at different points on the axes, relative to that question.

Two roles are redundant only when they match on **all three** axes. Two roles that share a square but differ in posture are complementary. Marketing asks whether the change is harder to talk about. The Innovation Lead asks what the change unlocks. Default to a defensive panel. Add a generative role only per the rules below.

### Available roles

Each name below is the profile filename in `role-profiles/`. Every profile opens with the key question of the role. A role that occupies two squares is listed in both.

**Defensive**

| | Internal | External | Strategic |
|---|---|---|---|
| **Now** | `qa-sdet` `security` `site-reliability-engineer` `ai-prompt-engineer` | `support` `integration-partner` `api-first-customer` `trial-user` `power-user` | `legal-counsel` |
| **Soon** | `engineering-tech-lead` `platform-devex` `ai-prompt-engineer` | `customer-success` `designer-ux` `sales` `technical-writer` `developer-advocate` | `finance-cfo` |
| **Later** | `cto` | `marketing` | `ceo-founder` `product-manager` `cto` `finance-cfo` |

**Generative**

| | Internal | External | Strategic |
|---|---|---|---|
| **Now** | `toolsmith` | `launch-editor` | — |
| **Soon** | `platform-capability-scout` | `growth-experimentation-lead` | `revenue-operations-analyst` |
| **Later** | `data-platform-scout` | `innovation-lead` | `innovation-lead` |

### Using the generative posture

Generative roles are opt-in. Include one only when the question asks about direction, leverage, or what to build next. Examples: "what does this unlock?", "are we missing anything?". Include one when the user asks for it by flag.

Do not add a generative role to a readiness review. Feature ideas dilute the blocking findings of a "is this ready to ship?" review. The Launch Editor is the one exception. Its findings expire at release and never become a backlog, so "what do we tell people?" belongs in a ship review. A generative role never replaces a defensive one. Run the defensive panel at full strength, then add the generative role beside it.

**Use at most two generative roles on a panel. Never use more generative roles than defensive roles.** Every diff makes something newly possible, so Opportunity findings are unbounded in a way that defects are not. A generative-heavy panel produces a long table that settles nothing.

Match the vantage of the generative role to the question:

- **Growth Lead** — a user-facing surface
- **Platform Capability Scout** — internal tooling or an abstraction
- **Data Platform Scout** — a change to what the system stores or emits
- **Launch Editor** — an imminent release
- **Toolsmith** — operational or deploy-time work
- **Revenue Operations Analyst** — usage, limits, or entitlements
- **Innovation Lead** — product direction

Two pairs sit close together. Growth and RevOps both notice usage counters and gating logic. Growth asks what user behavior the team can now test: activation, conversion. RevOps asks what the team can now count, attribute to a payer, and bill: packaging, metering, limits.

The Platform Capability Scout and the Toolsmith never run on the same panel. The audience of the Scout is code: which call sites can adopt what the diff introduced. The audience of the Toolsmith is a person: which hand-run procedure just got its last missing input.

---

## Flags

- `--role=<name>` — run a single role. Resolve `<name>` to the closest role in the grid above. For example, `qa` resolves to `qa-sdet`, and `revops` resolves to `revenue-operations-analyst`. Load only that profile.
- `--format=<format>` — `report` (default, markdown table) or `annotations` (JSON array for CI pipelines).
- `--brief` — regenerate the product brief unconditionally, then continue with the review. See [`brief.md`](brief.md).

---

## Workflow

1. **Load the product brief.** Read `.product-review/brief.md` in the reviewed repository. If the file does not exist, ask the user before you generate one. Then follow [`brief.md`](brief.md). If the recorded commit SHA is stale relative to `HEAD`, say so in the run. A run without a brief still works. The roles cannot fire the suppression rules that need product context, so the panel over-reports.
2. **Get the diff.** Run `git diff <base>...HEAD`. Review only the code that is visible in the diff. If no diff is available, ask the user for the code to review.
3. **Select the roles** per the panel selection criteria. For `--role`, load only that one profile.
4. **Run each role independently.** Read the profile of the role. Examine the diff through that lens alone. The findings of one role do not influence another.
5. **Check the evidence.** Each finding needs at least two evidence types. If in doubt, suppress the finding.
6. **Report the findings table.**
7. **Log the run.** Pipe a JSON object to `log.sh`. Use the base directory shown at the top of this skill as `<base-dir>`.

   ```bash
   echo '{
     "question": "...",
     "roles": [{"role": "...", "reason": "..."}],
     "findings": [{"criticality": "...", "role": "...", "observation": "...", "reasoning": "..."}]
   }' | bash "<base-dir>/log.sh"
   ```

   The script appends a timestamped entry to `logs/YYYY-MM-DD.json`, with computed criticality counts.

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

### `--format=report` (default)

Report a single markdown table, titled with the panel name. The columns are **Criticality**, **Role**, **Observation**, **Reasoning**. Use one row per finding. Sort the rows Blocking → Suggested → Opportunity. Write each cell as one concise sentence. The posture of the role sets the criticality:

| Value | Meaning |
|---|---|
| `Blocking` | The change must not ship as-is. Defensive roles only. |
| `Suggested` | The change can ship. The problem is still worth a fix. Defensive roles only. |
| `Opportunity` | Nothing is wrong. This names leverage that the change created. Generative roles only, and never a reason to hold a ship. |

| Criticality | Role | Observation | Reasoning |
|---|---|---|---|
| Blocking | Security | `createUser` at line 34 passes raw `req.body.email` directly into the SQL query string | No parameterization means that a malicious value can alter the query structure |
| Suggested | Tech Lead | `OrderService` now imports directly from `db/connection.ts` and bypasses the repository layer | This couples the service layer to persistence and will block a future database migration |
| Opportunity | Innovation Lead | `refundedAt` is written on every order at line 61 but never read | Refund history and a self-serve refund status page are now a query away, not a migration away |

If the panel raises no findings, report this row: `| — | — | No concerns raised. | — |`

Do not add prose, role sections, summaries, or recommendations. The table is the entire output. The user will ask follow-up questions for detail on any row.

### `--format=annotations`

Report a single JSON array. Each finding has this shape:

```json
{
  "skill": "product_review",
  "role": "qa",
  "file": "src/orders.ts",
  "line": 42,
  "claim": "...",
  "evidence": ["...", "..."],
  "confidence": "high",
  "severity": "blocking",
  "suggested_fix": "..."
}
```

`severity` is `blocking`, `suggested`, or `opportunity`. A CI pipeline must treat `opportunity` as informational. It must never fail a build.