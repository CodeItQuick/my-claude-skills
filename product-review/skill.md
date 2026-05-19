---
name: product-review
description: Assemble a panel of role-based reviewers for any question about a pull request or diff. Given a question, select 2–4 roles from role-profiles/ whose vantage points and time horizons cover the question without overlapping, then produce a focused findings table.
---

# Product Review

Select a panel of professional reviewers for a question about a change. Each role is defined in `role-profiles/` — their perspective, what they look for, and what they suppress. Where `pr-analysis` finds code-level patterns, `product-review` asks whether the change is ready to ship from the perspectives of the people who will live with the consequences.

---

## Panel selection

A panel is a set of roles whose questions do not overlap but all bear on the user's concern. The goal is coverage, not volume — three roles with genuinely different vantage points produce better findings than six that look at the same thing from similar angles.

### Two axes

**Vantage point** — where does the role sit relative to the product?

- **Internal / build** — roles that see the code and architecture (QA, Security, Tech Lead, CTO, Platform)
- **External / use** — roles that see the product from the outside (Customer Success, Support, Designer, Sales, Marketing)
- **Strategic** — roles that evaluate whether the product is the right product (CEO, PM, CTO)

**Time horizon** — when does the risk materialise?

- **Now** — does this work correctly when it ships? (QA, Security, Support)
- **Soon** — will users succeed with it? Will it create operational burden? (Designer, Customer Success, Tech Lead, Platform)
- **Later** — are we building the right foundation? I this the right direction? (CTO, PM, CEO, Marketing)

### How to pick

1. Identify what the question is really asking: is it a correctness question, a user experience question, a business question, or a strategic question?
2. Pick roles that sit at different points on the two axes relative to that question. Avoid picking two roles that share both a vantage point and a time horizon — they will find the same things.
3. Aim for 2–4 roles. Fewer is better if the question is narrow.

### Available roles

| Role | Key question                                                                  | Time horizon | Vantage | Profile |
|---|-------------------------------------------------------------------------------|---|---|---|
| QA / SDET | Are the failure modes covered?                                                | Now | Internal | [`role-profiles/qa-sdet.md`](role-profiles/qa-sdet.md) |
| Security | Does this introduce an exploitable surface?                                   | Now | Internal | [`role-profiles/security.md`](role-profiles/security.md) |
| Engineering / Tech Lead | Is this the right approach?                                                   | Soon | Internal | [`role-profiles/engineering-tech-lead.md`](role-profiles/engineering-tech-lead.md) |
| Customer Success | Will existing customers still be able to do what they came here to do?        | Soon | External | [`role-profiles/customer-success.md`](role-profiles/customer-success.md) |
| Support | Will I get tickets about this?                                                | Now | External | [`role-profiles/support.md`](role-profiles/support.md) |
| Designer / UX | Would someone who has never seen this know what to do?                        | Soon | External | [`role-profiles/designer-ux.md`](role-profiles/designer-ux.md) |
| Sales | Does this help me win deals?                                                  | Soon | External | [`role-profiles/sales.md`](role-profiles/sales.md) |
| Marketing | Does this make the product easier or harder to talk about?                    | Later | External | [`role-profiles/marketing.md`](role-profiles/marketing.md) |
| CEO / Founder | Is this who we are? Is this the right investment?                             | Later | Strategic | [`role-profiles/ceo-founder.md`](role-profiles/ceo-founder.md) |
| CTO | Are we building the right foundation?                                         | Later | Internal + Strategic | [`role-profiles/cto.md`](role-profiles/cto.md) |
| Product Manager | Is this the right thing to build right now?                                   | Later | Strategic | [`role-profiles/product-manager.md`](role-profiles/product-manager.md) |
| Platform / DevEx | Does this make the platform better or harder to maintain?                     | Soon | Internal | [`role-profiles/platform-devex.md`](role-profiles/platform-devex.md) |
| Site Reliability Engineer | When this breaks, will we know, and can we stop it?                           | Now | Internal | [`role-profiles/site-reliability-engineer.md`](role-profiles/site-reliability-engineer.md) |
| Technical Writer | Will a user who reads the docs be able to do what the code now allows?        | Soon | External | [`role-profiles/technical-writer.md`](role-profiles/technical-writer.md) |
| Developer Advocate | W  ould an external developer succeed with this, and would they recommend it? | Soon | External | [`role-profiles/developer-advocate.md`](role-profiles/developer-advocate.md) |
| Finance / CFO | What does this cost to run, and does it affect revenue correctly?             | Soon + Later | Strategic | [`role-profiles/finance-cfo.md`](role-profiles/finance-cfo.md) |
| Integration Partner | Will my existing integration still work after this ships?                     | Now | External | [`role-profiles/integration-partner.md`](role-profiles/integration-partner.md) |
| API-first Customer | Will the code I wrote against this API still produce correct results?         | Now | External | [`role-profiles/api-first-customer.md`](role-profiles/api-first-customer.md) |
| Trial User | Can I get to value before I run out of patience?                              | Now | External | [`role-profiles/trial-user.md`](role-profiles/trial-user.md) |
| Power User | Did anything change about how I actually use this every day?                  | Now | External | [`role-profiles/power-user.md`](role-profiles/power-user.md) |

---

## Flags

`--role=<role>` — run a single role. Valid values: `qa`, `security`, `tech-lead`, `customer-success`, `support`, `designer`, `sales`, `marketing`, `ceo`, `cto`, `pm`, `platform`, `sre`, `technical-writer`, `devrel`, `cfo`, `integration-partner`, `api-customer`, `trial-user`, `power-user`.

`--format=<format>` — `report` (default, markdown table) or `annotations` (JSON array for CI pipelines).

---

## Workflow

1. **Get the diff.** Run `git diff <base>...HEAD` and focus only on code visible in the diff. If no diff is available, ask the user to provide the code or diff to review.
2. **Select roles.** If `--role` is specified, load only that role's profile. Otherwise, read the user's question, apply the panel selection criteria above, and choose 2–4 roles whose vantage points and time horizons cover the question without overlapping.
3. **Run each role independently.** For each role, read their profile in `role-profiles/` and examine the diff through that lens. One role's findings do not influence another.
4. **For each candidate finding**, require at least two pieces of supporting evidence before reporting. When in doubt, suppress.
5. **Emit the findings table.**
6. **Log the run.** Append an entry to `logs/YYYY-MM-DD.md` (create the file if it does not exist). Each entry contains:
   - Timestamp (HH:MM)
   - Question asked
   - Roles selected and the one-sentence reason each was chosen
   - Full findings table (copied verbatim)
   - Count of Blocking and Suggested findings

## Evidence requirement

Each finding requires at least two of:
- **Code evidence** — a specific line or expression in the diff that demonstrates the concern
- **Path evidence** — a reachable code path that would trigger the problem
- **Convention evidence** — nearby or sibling code that establishes the expected pattern this violates
- **Impact evidence** — a concrete description of what goes wrong for a user or operator if this ships

## Confidence calibration

| Confidence | Action |
|---|---|
| `high` | Report as `Blocking` or `Suggested` |
| `medium` | Suppress. Do not report. |
| `low` | Suppress. Do not report. |

## Output format

### `--format=report` (default)

A single markdown table. Title is the panel name. Columns: **Criticality**, **Role**, **Observation**, **Reasoning**. One row per finding, sorted Blocking → Suggested. Each cell is one concise sentence.

| Criticality | Role | Observation | Reasoning |
|---|---|---|---|
| Blocking | Security | `createUser` at line 34 passes raw `req.body.email` directly into the SQL query string | No parameterisation means a malicious value can alter the query structure |
| Blocking | QA | The error path in `processPayment` has no test coverage | A failed charge silently returns `undefined`; no test would catch this regression |
| Suggested | Tech Lead | `OrderService` now imports directly from `db/connection.ts`, bypassing the repository layer | This couples the service layer to persistence and will block future database migration |

If no findings: `| — | — | No concerns raised. | — |`

Do not output prose, role sections, summaries, or recommendations. The table is the entire output. The user will ask follow-up questions for detail on any row.

### `--format=annotations`

A single JSON array. Each finding:

```json
{
  "skill": "product_review",
  "panel": "is-it-working",
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