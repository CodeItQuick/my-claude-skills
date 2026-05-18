---
name: product-review
description: Run a panel of role-based reviewers over a pull request or diff, each examining the change through a distinct professional lens. Use when asked "is this working?", "will this break anything?", "is this safe to ship?", "are customers happy?", "can we sell this?", "where are we going?", "is this on the roadmap?", or "get some eyes on this". Supports four panels - Is It Working? (QA/SDET, Security, Engineering/Tech Lead); Are Customers Happy? (Customer Success, Support, Designer/UX); Can We Sell It? (Sales, Marketing, CEO/Founder); Where Are We Going? (CTO, Product Manager, Platform/DevEx).
---

# Product Review

Run a panel of professional reviewers over changed code, each asking the questions their role demands. Where `pr-analysis` finds code-level patterns, `product-review` asks whether the change is ready to ship from the perspectives of the people who will live with the consequences.

## Panels

### Is It Working?

The reliability panel. Three reviewers who each have a different definition of "broken".

| Role | What they ask | Review guide |
|---|---|---|
| QA / SDET | Are the failure modes covered? Will this break silently? What edge cases were missed? | [`role-profiles/qa-sdet.md`](role-profiles/qa-sdet.md) |
| Security | Does this introduce an exploitable surface? Is user input trusted anywhere it shouldn't be? | [`role-profiles/security.md`](role-profiles/security.md) |
| Engineering / Tech Lead | Is this the right approach? Will it hold up? Will we regret this in six months? | [`role-profiles/engineering-tech-lead.md`](role-profiles/engineering-tech-lead.md) |

### Are Customers Happy?

The customer experience panel. Three reviewers who each hear from customers differently — and know what a change looks like from the outside.

| Role | What they ask | Review guide |
|---|---|---|
| Customer Success | Will existing customers still be able to do what they came here to do? Will anyone lose something they depend on? | [`role-profiles/customer-success.md`](role-profiles/customer-success.md) |
| Support | Will I get tickets about this? Will I be able to help the person who sends them? | [`role-profiles/support.md`](role-profiles/support.md) |
| Designer / UX | Would someone who has never seen this know what to do? Would they feel confident they did it right? | [`role-profiles/designer-ux.md`](role-profiles/designer-ux.md) |

### Can We Sell It?

The commercial readiness panel. Three reviewers who think about the product from the outside in — through the lens of deals, messaging, and strategy.

| Role | What they ask | Review guide |
|---|---|---|
| Sales | Does this help me win deals? Does it break anything I'm using to close them? | [`role-profiles/sales.md`](role-profiles/sales.md) |
| Marketing | Does this make the product easier or harder to talk about? Does it affect what we can credibly claim? | [`role-profiles/marketing.md`](role-profiles/marketing.md) |
| CEO / Founder | Is this who we are? Is this where we're going? Is this the highest-leverage use of the team? | [`role-profiles/ceo-founder.md`](role-profiles/ceo-founder.md) |

### Where Are We Going?

The direction panel. Three reviewers who think about whether this change belongs in the product the company is building toward.

| Role | What they ask | Review guide |
|---|---|---|
| CTO | Are we building the right foundation? Will we regret the decisions in this diff in three years? | [`role-profiles/cto.md`](role-profiles/cto.md) |
| Product Manager | Is this the right thing to build right now? Does it solve the problem we said it would? | [`role-profiles/product-manager.md`](role-profiles/product-manager.md) |
| Platform / DevEx | Does this make the platform better or harder to maintain? Are we setting the right precedent? | [`role-profiles/platform-devex.md`](role-profiles/platform-devex.md) |

## Flags

`--panel=<panel>` — run a specific panel. Valid values: `is-it-working`, `are-customers-happy`, `can-we-sell-it`, `where-are-we-going`. Default: `is-it-working`.

`--role=<role>` — run a single role only. Valid values: `qa`, `security`, `tech-lead`, `customer-success`, `support`, `designer`, `sales`, `marketing`, `ceo`, `cto`, `pm`, `platform`. Takes precedence over `--panel`.

`--format=<format>` — control output format. Valid values: `report` (default, grouped by role), `annotations` (JSON array of findings, one per finding, for CI pipelines).

---

## When to use

- Someone asks "is this working?", "will this break?", "is this safe to merge?", or "does this hold up?" → use `--panel=is-it-working`
- A PR touches security-sensitive code (auth, input handling, data access) and needs a dedicated security pass → use `--role=security`
- A change introduces a new pattern or architectural decision that needs a tech lead perspective → use `--role=tech-lead`
- Someone asks "are customers happy?", "will users understand this?", or "will this generate tickets?" → use `--panel=are-customers-happy`
- A PR changes user-facing flows, copy, or error messages → use `--role=designer` or `--role=support`
- A PR removes or changes behaviour existing customers depend on → use `--role=customer-success`
- Someone asks "can we sell this?", "is this on strategy?", or "does this help us close deals?" → use `--panel=can-we-sell-it`
- A change affects a competitive differentiator, a positioning claim, or a flagship feature → use `--role=marketing` or `--role=ceo`
- A change adds or removes something that will come up in a sales demo or trial → use `--role=sales`
- Someone asks "where are we going?", "is this on the roadmap?", or "is this the right foundation?" → use `--panel=where-are-we-going`
- A change makes an implicit platform bet or architectural commitment → use `--role=cto`
- A change ships a feature without instrumentation or drifts from the agreed scope → use `--role=pm`
- A change introduces a new pattern or touches shared infrastructure → use `--role=platform`

## Workflow

1. **Get the diff.** Run `git diff <base>...HEAD` and focus only on code visible in the diff.
2. **Determine which roles to run.** If `--role` is specified, run only that role. If `--panel` is specified, run all roles in that panel. Default: run the full Is It Working? panel.
3. **Run each role in sequence.** For each role, read their review guide and examine the diff through that lens. Each role is independent — findings from one role do not influence another.
4. **For each candidate finding**, require at least two pieces of supporting evidence before reporting. When in doubt, suppress.
5. **Emit findings grouped by role.** Each role's section lists their concerns with severity labels.
6. **Produce a summary** of total findings per role and an overall ship/hold recommendation.

## Evidence requirement

Each finding requires at least two of:
- **Code evidence** — a specific line or expression in the diff that demonstrates the concern
- **Path evidence** — a reachable code path that would trigger the problem
- **Convention evidence** — nearby or sibling code that establishes the expected pattern this violates
- **Impact evidence** — a concrete description of what goes wrong for a user or operator if this ships

## Confidence calibration

| Confidence | Action |
|---|---|
| `high` | Report as `Blocking:` or `Suggested:` |
| `medium` | Suppress. Do not comment. |
| `low` | Suppress. Do not comment. |

## Output format

### `--format=report` (default)

Group findings by role. For each role:

```
## QA / SDET
[findings or "No concerns."]

## Security
[findings or "No concerns."]

## Engineering / Tech Lead
[findings or "No concerns."]

---
Recommendation: SHIP | HOLD | SHIP WITH NOTES
[one sentence rationale]
```

If no role has findings: `No concerns raised by the [panel name] panel.`

### `--format=annotations`

Emit a single JSON array. Each finding object:

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