---
name: product-review
description: Assemble a panel of role-based reviewers for any question about a pull request or diff. Given a question, select 2–4 roles from role-profiles/ whose postures, vantage points and time horizons cover the question without overlapping, then produce a focused findings table.
---

# Product Review

Select a panel of professional reviewers for a question about a change. Each role in `role-profiles/` defines a perspective: what it looks for and what it suppresses. Where `pr-analysis` finds code-level patterns, `product-review` asks whether the change is ready to ship, from the perspectives of the people who will live with the consequences.

---

## Panel selection

A panel is 2–4 roles whose questions do not overlap but all bear on the user's concern. Coverage beats volume: three roles with genuinely different vantage points produce better findings than six that look from similar angles. Spread the panel across three axes:

**Posture** — is the role looking for what is wrong, or for what is missing?

- **Defensive** — reads the diff for what should not ship: defects, risks, costs, confusion. Emits `Blocking` and `Suggested` findings.
- **Generative** — reads the diff for what should exist next: leverage, adjacency, unserved need. Emits `Opportunity` findings only, which never hold a ship decision.

**Vantage point** — where does the role sit relative to the product?

- **Internal / build** — sees the code and architecture
- **External / use** — sees the product from the outside
- **Strategic** — asks whether this is the right product, and whether the company can ship it at all

**Time horizon** — when does the consequence materialise? (For a defensive role, when the risk lands; for a generative role, when the opportunity would pay off.)

- **Now** — does this work correctly when it ships?
- **Soon** — will users succeed with it? Will it create operational burden?
- **Later** — is this the right foundation and the right direction?

To pick: identify whether the question is about correctness, user experience, business, or strategy, then choose roles that sit at different points on the axes relative to it. Two roles are redundant only when they match on **all three** axes. Roles that share a square but differ in posture are complementary: Marketing asks whether the change is harder to talk about, while the Innovation Lead asks what it unlocks. Default to a defensive panel; add a generative role only per the rules below.

### Available roles

| Role | Key question | Posture | Time horizon | Vantage | Profile |
|---|---|---|---|---|---|
| QA / SDET | Are the failure modes covered? | Defensive | Now | Internal | [`qa-sdet`](role-profiles/qa-sdet.md) |
| Security | Does this introduce an exploitable surface? | Defensive | Now | Internal | [`security`](role-profiles/security.md) |
| Engineering / Tech Lead | Is this the right approach? | Defensive | Soon | Internal | [`engineering-tech-lead`](role-profiles/engineering-tech-lead.md) |
| Customer Success | Will existing customers still be able to do what they came here to do? | Defensive | Soon | External | [`customer-success`](role-profiles/customer-success.md) |
| Support | Will I get tickets about this? | Defensive | Now | External | [`support`](role-profiles/support.md) |
| Designer / UX | Would someone who has never seen this know what to do? | Defensive | Soon | External | [`designer-ux`](role-profiles/designer-ux.md) |
| Sales | Does this help me win deals? | Defensive | Soon | External | [`sales`](role-profiles/sales.md) |
| Marketing | Does this make the product easier or harder to talk about? | Defensive | Later | External | [`marketing`](role-profiles/marketing.md) |
| CEO / Founder | Is this who we are? Is this the right investment? | Defensive | Later | Strategic | [`ceo-founder`](role-profiles/ceo-founder.md) |
| CTO | Are we building the right foundation? | Defensive | Later | Internal + Strategic | [`cto`](role-profiles/cto.md) |
| Product Manager | Is this the right thing to build right now? | Defensive | Later | Strategic | [`product-manager`](role-profiles/product-manager.md) |
| Platform / DevEx | Does this make the platform better or harder to maintain? | Defensive | Soon | Internal | [`platform-devex`](role-profiles/platform-devex.md) |
| Site Reliability Engineer | When this breaks, will we know, and can we stop it? | Defensive | Now | Internal | [`site-reliability-engineer`](role-profiles/site-reliability-engineer.md) |
| Technical Writer | Will a user who reads the docs be able to do what the code now allows? | Defensive | Soon | External | [`technical-writer`](role-profiles/technical-writer.md) |
| Developer Advocate | Would an external developer succeed with this, and would they recommend it? | Defensive | Soon | External | [`developer-advocate`](role-profiles/developer-advocate.md) |
| Finance / CFO | What does this cost to run, and does it affect revenue correctly? | Defensive | Soon + Later | Strategic | [`finance-cfo`](role-profiles/finance-cfo.md) |
| Integration Partner | Will my existing integration still work after this ships? | Defensive | Now | External | [`integration-partner`](role-profiles/integration-partner.md) |
| API-first Customer | Will the code I wrote against this API still produce correct results? | Defensive | Now | External | [`api-first-customer`](role-profiles/api-first-customer.md) |
| Trial User | Can I get to value before I run out of patience? | Defensive | Now | External | [`trial-user`](role-profiles/trial-user.md) |
| Power User | Did anything change about how I actually use this every day? | Defensive | Now | External | [`power-user`](role-profiles/power-user.md) |
| AI Prompt Engineer | Is this prompt a reliable spec — or does it leave enough ambiguity that the model will guess inconsistently? | Defensive | Now + Soon | Internal | [`ai-prompt-engineer`](role-profiles/ai-prompt-engineer.md) |
| Legal Counsel / Compliance | Does this breach a commitment we have already made? | Defensive | Now | Strategic | [`legal-counsel`](role-profiles/legal-counsel.md) |
| Innovation Lead | What does this change make cheap that wasn't cheap before? | **Generative** | Later | Strategic + External | [`innovation-lead`](role-profiles/innovation-lead.md) |
| Growth / Experimentation Lead | What experiment is now a config change rather than a project? | **Generative** | Soon | External | [`growth-experimentation-lead`](role-profiles/growth-experimentation-lead.md) |
| Platform Capability Scout | What did this make available to the rest of the codebase? | **Generative** | Soon | Internal | [`platform-capability-scout`](role-profiles/platform-capability-scout.md) |
| Data Platform Scout | What did this make knowable, and what is unrecoverable if we don't record it now? | **Generative** | Later | Internal | [`data-platform-scout`](role-profiles/data-platform-scout.md) |
| Launch Editor | What just became true for users that nothing here tells them? | **Generative** | Now | External | [`launch-editor`](role-profiles/launch-editor.md) |
| Toolsmith | What manual step did this just supply the last missing input for? | **Generative** | Now | Internal | [`toolsmith`](role-profiles/toolsmith.md) |
| Revenue Operations Analyst | What did this make countable, attributable, and separable? | **Generative** | Soon | Strategic | [`revenue-operations-analyst`](role-profiles/revenue-operations-analyst.md) |

### Using the generative posture

Generative roles are opt-in. Include one only when the question asks about direction, leverage, or what to build next ("what does this unlock?", "are we missing anything?"), or when requested by flag. Do not add one to a readiness review — padding "is this ready to ship?" with feature ideas dilutes the blocking findings. The one exception is the Launch Editor, whose findings expire at release rather than accumulating as a backlog: "what should we tell people?" is a shipping question. A generative role never replaces a defensive one; run the defensive panel at full strength and add the generative role alongside it.

**At most two generative roles on a panel, and never more than the number of defensive roles.** Every diff makes something newly possible, so Opportunity findings are unbounded in a way defects are not, and a generative-heavy panel produces a long table that settles nothing. Match the generative role's vantage to the question: Growth Lead for a user-facing surface, Platform Capability Scout for internal tooling or an abstraction, Data Platform Scout for a change to what is stored or emitted, Launch Editor when a release is imminent, Toolsmith for operational or deploy-time work, Revenue Operations Analyst for usage, limits, or entitlements, Innovation Lead for product direction.

Two pairs sit close together. Growth and RevOps both notice usage counters and gating logic: Growth asks what user behaviour could now be tested (activation, conversion), RevOps asks what could now be counted, attributed to a payer, and billed (packaging, metering, limits). The Platform Capability Scout and the Toolsmith never run on the same panel: the Scout's audience is code (which call sites could adopt what the diff introduced), the Toolsmith's is a person (which hand-run procedure just got its last missing input).

---

## Flags

- `--role=<name>` — run a single role. Resolve `<name>` to the closest role in the table above (for example `qa` → `qa-sdet`, `revops` → `revenue-operations-analyst`) and load only that profile.
- `--format=<format>` — `report` (default, markdown table) or `annotations` (JSON array for CI pipelines).
- `--brief` — regenerate the product brief unconditionally, then continue with the review. See [`brief.md`](brief.md).

---

## Workflow

1. **Load the product brief.** Read `.product-review/brief.md` in the reviewed repository. If it does not exist, ask the user before generating one, then follow [`brief.md`](brief.md). If its recorded commit SHA is stale relative to `HEAD`, say so in the run. A run without a brief still works — roles simply cannot fire the suppression rules that depend on product context, so the panel will over-report.
2. **Get the diff.** Run `git diff <base>...HEAD` and review only code visible in the diff. If no diff is available, ask the user for the code to review.
3. **Select roles** per the panel selection criteria, or load only the `--role` profile.
4. **Run each role independently.** Read its profile and examine the diff through that lens alone. One role's findings do not influence another's.
5. **Check evidence.** Each finding requires at least two supporting evidence types. When in doubt, suppress.
6. **Emit the findings table.**
7. **Log the run.** Pipe a JSON object to `log.sh`, using the base directory shown at the top of this skill as `<base-dir>`:

   ```bash
   echo '{
     "question": "...",
     "roles": [{"role": "...", "reason": "..."}],
     "findings": [{"criticality": "...", "role": "...", "observation": "...", "reasoning": "..."}]
   }' | bash "<base-dir>/log.sh"
   ```

   The script appends a timestamped entry, with computed criticality counts, to `logs/YYYY-MM-DD.json`.

## Evidence requirement

Each finding requires at least two of:

- **Code evidence** — a specific line or expression in the diff that demonstrates the concern
- **Path evidence** — a reachable code path that would trigger the problem
- **Convention evidence** — nearby or sibling code that establishes the expected pattern this violates
- **Impact evidence** — a concrete description of what goes wrong for a user or operator if this ships (defensive roles only)
- **Leverage evidence** — a specific construct in the diff, the named capability it puts within reach, and why that capability is materially cheaper to build now than before (generative roles only)

Code, path, and convention evidence are available to both postures; impact and leverage evidence belong to one posture each.

### The product brief is context, never evidence

The brief (see [`brief.md`](brief.md)) supplies facts a diff cannot: who the users are, whether anything is billed, what data is held. It changes what a role considers relevant, not what a role can prove.

- A brief fact can **suppress** a finding on its own. "No billing code present" is sufficient to silence the Revenue Operations Analyst.
- A brief fact can **never support** a finding. Every reported finding still needs two evidence types from the diff.
- The brief's **Inferred** lines carry less weight still: they can frame a finding's reasoning, but a finding resting only on them is suppressed, and named-competitor claims are always phrased as claims to verify.
- The brief's **Unknowns** mean *unknown*, not *absent*. A role that needs one of those facts to make its case suppresses the finding rather than assuming a value.

## Confidence calibration

Report only `high`-confidence findings. `medium` and `low` are suppressed, never reported — profile soft-suppression rules work by downgrading confidence to `medium`.

## Output format

### `--format=report` (default)

A single markdown table titled with the panel name. Columns: **Criticality**, **Role**, **Observation**, **Reasoning**. One row per finding, sorted Blocking → Suggested → Opportunity, each cell one concise sentence. Criticality follows from posture:

| Value | Meaning |
|---|---|
| `Blocking` | Should not ship as-is. Defensive roles only. |
| `Suggested` | Should ship, but this is worth fixing. Defensive roles only. |
| `Opportunity` | Nothing is wrong; this names leverage the change created. Generative roles only, and never a reason to hold a ship. |

| Criticality | Role | Observation | Reasoning |
|---|---|---|---|
| Blocking | Security | `createUser` at line 34 passes raw `req.body.email` directly into the SQL query string | No parameterisation means a malicious value can alter the query structure |
| Suggested | Tech Lead | `OrderService` now imports directly from `db/connection.ts`, bypassing the repository layer | This couples the service layer to persistence and will block future database migration |
| Opportunity | Innovation Lead | `refundedAt` is written on every order at line 61 but never read | Refund history and a self-serve refund status page are now a query away rather than a migration away |

If no findings: `| — | — | No concerns raised. | — |`

Do not output prose, role sections, summaries, or recommendations. The table is the entire output; the user will ask follow-up questions for detail on any row.

### `--format=annotations`

A single JSON array. Each finding:

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

`severity` is `blocking`, `suggested`, or `opportunity`. CI pipelines must treat `opportunity` as informational — it must never fail a build.