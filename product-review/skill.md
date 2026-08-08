---
name: product-review
description: Assemble a panel of role-based reviewers for any question about a pull request or diff. Given a question, select 2–4 roles from role-profiles/ whose postures, vantage points and time horizons cover the question without overlapping, then produce a focused findings table.
---

# Product Review

Select a panel of professional reviewers for a question about a change. Each role is defined in `role-profiles/` — their perspective, what they look for, and what they suppress. Where `pr-analysis` finds code-level patterns, `product-review` asks whether the change is ready to ship from the perspectives of the people who will live with the consequences.

---

## Panel selection

A panel is a set of roles whose questions do not overlap but all bear on the user's concern. The goal is coverage, not volume — three roles with genuinely different vantage points produce better findings than six that look at the same thing from similar angles. Each role is placed on three axes; a panel covers the question by spreading across them.

### Three axes

**Posture** — is the role looking for what is wrong, or for what is missing?

- **Defensive** — reads the diff for what should not ship: defects, risks, costs, confusion. Emits `Blocking` and `Suggested` findings. Almost every role is defensive.
- **Generative** — reads the diff for what should exist next: leverage, adjacency, unserved need. Emits `Opportunity` findings only, which never hold a ship decision (Innovation Lead).

**Vantage point** — where does the role sit relative to the product?

- **Internal / build** — roles that see the code and architecture (QA, Security, Tech Lead, CTO, Platform)
- **External / use** — roles that see the product from the outside (Customer Success, Support, Designer, Sales, Marketing)
- **Strategic** — roles that evaluate whether the product is the right product (CEO, PM, CTO)

**Time horizon** — when does the consequence materialise? (For a defensive role, when the risk lands; for a generative role, when the opportunity would pay off.)

- **Now** — does this work correctly when it ships? (QA, Security, Support)
- **Soon** — will users succeed with it? Will it create operational burden? (Designer, Customer Success, Tech Lead, Platform)
- **Later** — are we building the right foundation? Is this the right direction? (CTO, PM, CEO, Marketing, Innovation Lead)

### How to pick

1. Identify what the question is really asking: is it a correctness question, a user experience question, a business question, or a strategic question?
2. Pick roles that sit at different points on the three axes relative to that question. Two roles are redundant only when they match on **all three** — same posture, same vantage, same horizon. Roles that share a square but differ in posture are complementary, not overlapping: Marketing and the Innovation Lead are both Later + External, but one asks whether the change is harder to talk about and the other asks what it unlocks.
3. Default to a defensive panel. Add the generative role only when the question calls for it — see below.
4. Aim for 3–5 roles. Fewer is better if the question is narrow.

### Available roles

| Role | Key question | Posture | Time horizon | Vantage | Profile |
|---|---|---|---|---|---|
| QA / SDET | Are the failure modes covered? | Defensive | Now | Internal | [`role-profiles/qa-sdet.md`](role-profiles/qa-sdet.md) |
| Security | Does this introduce an exploitable surface? | Defensive | Now | Internal | [`role-profiles/security.md`](role-profiles/security.md) |
| Engineering / Tech Lead | Is this the right approach? | Defensive | Soon | Internal | [`role-profiles/engineering-tech-lead.md`](role-profiles/engineering-tech-lead.md) |
| Customer Success | Will existing customers still be able to do what they came here to do? | Defensive | Soon | External | [`role-profiles/customer-success.md`](role-profiles/customer-success.md) |
| Support | Will I get tickets about this? | Defensive | Now | External | [`role-profiles/support.md`](role-profiles/support.md) |
| Designer / UX | Would someone who has never seen this know what to do? | Defensive | Soon | External | [`role-profiles/designer-ux.md`](role-profiles/designer-ux.md) |
| Sales | Does this help me win deals? | Defensive | Soon | External | [`role-profiles/sales.md`](role-profiles/sales.md) |
| Marketing | Does this make the product easier or harder to talk about? | Defensive | Later | External | [`role-profiles/marketing.md`](role-profiles/marketing.md) |
| CEO / Founder | Is this who we are? Is this the right investment? | Defensive | Later | Strategic | [`role-profiles/ceo-founder.md`](role-profiles/ceo-founder.md) |
| CTO | Are we building the right foundation? | Defensive | Later | Internal + Strategic | [`role-profiles/cto.md`](role-profiles/cto.md) |
| Product Manager | Is this the right thing to build right now? | Defensive | Later | Strategic | [`role-profiles/product-manager.md`](role-profiles/product-manager.md) |
| Platform / DevEx | Does this make the platform better or harder to maintain? | Defensive | Soon | Internal | [`role-profiles/platform-devex.md`](role-profiles/platform-devex.md) |
| Site Reliability Engineer | When this breaks, will we know, and can we stop it? | Defensive | Now | Internal | [`role-profiles/site-reliability-engineer.md`](role-profiles/site-reliability-engineer.md) |
| Technical Writer | Will a user who reads the docs be able to do what the code now allows? | Defensive | Soon | External | [`role-profiles/technical-writer.md`](role-profiles/technical-writer.md) |
| Developer Advocate | Would an external developer succeed with this, and would they recommend it? | Defensive | Soon | External | [`role-profiles/developer-advocate.md`](role-profiles/developer-advocate.md) |
| Finance / CFO | What does this cost to run, and does it affect revenue correctly? | Defensive | Soon + Later | Strategic | [`role-profiles/finance-cfo.md`](role-profiles/finance-cfo.md) |
| Integration Partner | Will my existing integration still work after this ships? | Defensive | Now | External | [`role-profiles/integration-partner.md`](role-profiles/integration-partner.md) |
| API-first Customer | Will the code I wrote against this API still produce correct results? | Defensive | Now | External | [`role-profiles/api-first-customer.md`](role-profiles/api-first-customer.md) |
| Trial User | Can I get to value before I run out of patience? | Defensive | Now | External | [`role-profiles/trial-user.md`](role-profiles/trial-user.md) |
| Power User | Did anything change about how I actually use this every day? | Defensive | Now | External | [`role-profiles/power-user.md`](role-profiles/power-user.md) |
| AI Prompt Engineer | Is this prompt a reliable spec — or does it leave enough ambiguity that the model will guess inconsistently? | Defensive | Now + Soon | Internal | [`role-profiles/ai-prompt-engineer.md`](role-profiles/ai-prompt-engineer.md) |
| Innovation Lead | What does this change make cheap that wasn't cheap before? | **Generative** | Later | Strategic + External | [`role-profiles/innovation-lead.md`](role-profiles/innovation-lead.md) |

### Using the generative posture

Generative roles are opt-in. Include one only when the question asks about direction, leverage, or what to build next (`what should we do with this?`, `what does this unlock?`, `are we missing anything?`), or when requested by flag. Do not add one to a readiness review — padding "is this ready to ship?" with feature ideas dilutes the blocking findings.

A generative role never replaces a defensive one. If the question warrants both, run the defensive panel at full strength and add the generative role alongside it; its `Opportunity` findings sort last and change no ship decision.

---

## Flags

`--role=<role>` — run a single role. Flag value to profile file mapping:

| Flag value | Profile file |
|---|---|
| `qa` | `role-profiles/qa-sdet.md` |
| `security` | `role-profiles/security.md` |
| `tech-lead` | `role-profiles/engineering-tech-lead.md` |
| `customer-success` | `role-profiles/customer-success.md` |
| `support` | `role-profiles/support.md` |
| `designer` | `role-profiles/designer-ux.md` |
| `sales` | `role-profiles/sales.md` |
| `marketing` | `role-profiles/marketing.md` |
| `ceo` | `role-profiles/ceo-founder.md` |
| `cto` | `role-profiles/cto.md` |
| `pm` | `role-profiles/product-manager.md` |
| `platform` | `role-profiles/platform-devex.md` |
| `sre` | `role-profiles/site-reliability-engineer.md` |
| `technical-writer` | `role-profiles/technical-writer.md` |
| `devrel` | `role-profiles/developer-advocate.md` |
| `cfo` | `role-profiles/finance-cfo.md` |
| `integration-partner` | `role-profiles/integration-partner.md` |
| `api-customer` | `role-profiles/api-first-customer.md` |
| `trial-user` | `role-profiles/trial-user.md` |
| `power-user` | `role-profiles/power-user.md` |
| `prompt-engineer` | `role-profiles/ai-prompt-engineer.md` |
| `innovation` | `role-profiles/innovation-lead.md` |

`--format=<format>` — `report` (default, markdown table) or `annotations` (JSON array for CI pipelines).

---

## Workflow

1. **Get the diff.** Run `git diff <base>...HEAD` and focus only on code visible in the diff. If no diff is available, ask the user to provide the code or diff to review.
2. **Select roles.** If `--role` is specified, load only that role's profile. Otherwise, read the user's question, apply the panel selection criteria above, and choose 2–4 roles whose postures, vantage points and time horizons cover the question without overlapping.
3. **Run each role independently.** For each role, read their profile in `role-profiles/` and examine the diff through that lens. One role's findings do not influence another.
4. **For each candidate finding**, require at least two pieces of supporting evidence before reporting. When in doubt, suppress.
5. **Emit the findings table.**
6. **Log the run.** Pipe a JSON object to `log.sh`. Use the base directory shown at the top of this skill (`Base directory for this skill: …`) as `<base-dir>`:

   ```bash
   echo '{
     "question": "...",
     "roles": [{"role": "...", "reason": "..."}],
     "findings": [{"criticality": "...", "role": "...", "observation": "...", "reasoning": "..."}]
   }' | bash "<base-dir>/log.sh"
   ```

   The script appends a timestamped entry (including computed Blocking/Suggested counts) to `logs/YYYY-MM-DD.json`, creating the file if it does not exist.

## Evidence requirement

Each finding requires at least two of:
- **Code evidence** — a specific line or expression in the diff that demonstrates the concern
- **Path evidence** — a reachable code path that would trigger the problem
- **Convention evidence** — nearby or sibling code that establishes the expected pattern this violates
- **Impact evidence** — a concrete description of what goes wrong for a user or operator if this ships
- **Leverage evidence** — a specific construct in the diff plus the named capability it puts within reach, and why that capability is materially cheaper to build now than before the change (generative roles only)

Impact evidence and leverage evidence are posture-specific: a defensive role cannot support a finding with leverage evidence, and a generative role cannot support one with impact evidence. Code, path, and convention evidence are available to both.

## Confidence calibration

| Confidence | Action |
|---|---|
| `high` | Report as `Blocking`, `Suggested`, or `Opportunity` |
| `medium` | Suppress. Do not report. |
| `low` | Suppress. Do not report. |

## Output format

### `--format=report` (default)

A single markdown table. Title is the panel name. Columns: **Criticality**, **Role**, **Observation**, **Reasoning**. One row per finding, sorted Blocking → Suggested → Opportunity. Each cell is one concise sentence.

Criticality values:

| Value | Meaning |
|---|---|
| `Blocking` | Should not ship as-is. Defensive roles only. |
| `Suggested` | Should ship, but this is worth fixing. Defensive roles only. |
| `Opportunity` | Nothing is wrong; this names leverage the change created. Generative roles only, and never a reason to hold a ship. |

Criticality follows from posture: a defensive role never emits `Opportunity`, and a generative role emits nothing else.

| Criticality | Role | Observation | Reasoning |
|---|---|---|---|
| Blocking | Security | `createUser` at line 34 passes raw `req.body.email` directly into the SQL query string | No parameterisation means a malicious value can alter the query structure |
| Blocking | QA | The error path in `processPayment` has no test coverage | A failed charge silently returns `undefined`; no test would catch this regression |
| Suggested | Tech Lead | `OrderService` now imports directly from `db/connection.ts`, bypassing the repository layer | This couples the service layer to persistence and will block future database migration |
| Opportunity | Innovation Lead | `refundedAt` is written on every order at line 61 but never read | Refund history and a self-serve refund status page are now a query away rather than a migration away |

If no findings: `| — | — | No concerns raised. | — |`

Do not output prose, role sections, summaries, or recommendations. The table is the entire output. The user will ask follow-up questions for detail on any row.

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

`severity` is `blocking`, `suggested`, or `opportunity`. CI pipelines should treat `opportunity` as informational — it must never fail a build.

---

## Example — end to end

**Invocation:** `/product-review Is the new checkout flow ready to ship?`

**Step 1 — Get the diff:** `git diff main...HEAD`

**Step 2 — Select roles:** The question is a correctness + user-experience question. Pick QA (Now/Internal), Designer (Soon/External), Customer Success (Soon/External) — three non-overlapping vantage points.

**Step 3 — Run each role independently**, reading their profile from `role-profiles/`.

**Step 4 — Apply evidence requirement.** Suppress any finding without two supporting evidence types.

**Step 5 — Emit findings table:**

| Criticality | Role | Observation | Reasoning |
|---|---|---|---|
| Blocking | QA | `placeOrder` at line 88 swallows the payment gateway timeout error and returns `null` | A timed-out charge silently appears successful to the user; no test covers this path |
| Suggested | Designer | The order confirmation screen has no empty state for zero-item orders | A user who empties their cart mid-checkout reaches a blank screen with no explanation or recovery path |

**Step 6 — Log the run** via `log.sh`.