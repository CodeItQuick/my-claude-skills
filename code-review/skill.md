---
name: code-review
description: Assemble a panel of specialist engineering reviewers for a pull request or diff. Given a question about implementation quality, select roles from role-profiles/ whose technical disciplines are relevant to the change, then produce a focused findings table. Roles cover database correctness, frontend state, caching, observability, test quality, stream processing, web performance, technical debt, and refactoring.
---

# Code Review

Select a panel of specialist engineers to review the implementation quality of a change. Each role is defined in `role-profiles/` — their technical discipline, what they look for, and what they suppress. Where `product-review` asks whether the right thing was built, `code-review` asks whether it was built correctly for each relevant technical domain.

---

## Panel selection

A panel is a set of roles whose disciplines are relevant to the change and do not duplicate each other. The goal is coverage of the technical surface the diff touches — a database change warrants the Database Engineer; a React component warrants the Frontend Specialist; a Kafka consumer warrants the Stream Processing Specialist.

### How to pick

1. Identify which technical domains the diff touches — database, frontend, caching, observability, tests, streaming, performance, or general structure.
2. Select the role whose discipline matches each domain. A diff that touches multiple domains warrants multiple roles.
3. Aim for 2–4 roles. A diff that touches only one domain warrants one role.

### Available roles

| Role | Key question | Domain | Profile |
|---|---|---|---|
| Database Engineer | Will this be correct and fast when the data is ten times larger? | Data layer | [`role-profiles/database-engineer.md`](role-profiles/database-engineer.md) |
| Web Performance Engineer | Does this make the product slower to load or interact with? | Frontend performance | [`role-profiles/web-performance-engineer.md`](role-profiles/web-performance-engineer.md) |
| Observability Engineer | Will we be able to see what is happening after this ships? | Instrumentation | [`role-profiles/observability-engineer.md`](role-profiles/observability-engineer.md) |
| Test Architect | Does the test suite still accurately verify what the code is supposed to do? | Test quality | [`role-profiles/test-architect.md`](role-profiles/test-architect.md) |
| Technical Debt Analyst | Does this change leave the codebase harder or easier to work in? | Code health | [`role-profiles/technical-debt-analyst.md`](role-profiles/technical-debt-analyst.md) |
| Refactoring Specialist | Is the structure of this code the simplest correct expression of the problem? | Code structure | [`role-profiles/refactoring-specialist.md`](role-profiles/refactoring-specialist.md) |
| Frontend Specialist | Is the client-side data flow, state ownership, and render behaviour correct? | Frontend correctness | [`role-profiles/frontend-specialist.md`](role-profiles/frontend-specialist.md) |
| Stream Processing Specialist | What happens to correctness when this system restarts or receives duplicate events? | Event streaming | [`role-profiles/stream-processing-specialist.md`](role-profiles/stream-processing-specialist.md) |
| Caching Engineer | Does this use the cache correctly, and what happens when the cache is wrong? | Caching | [`role-profiles/caching-engineer.md`](role-profiles/caching-engineer.md) |
| Distributed Systems Architect | What happens to correctness when two of these run simultaneously or the network drops a message? | Distributed systems | [`role-profiles/distributed-systems-architect.md`](role-profiles/distributed-systems-architect.md) |
| Code Review Specialist | Could a competent engineer who did not write this accurately review it and catch a bug? | Reviewability | [`role-profiles/code-review-specialist.md`](role-profiles/code-review-specialist.md) |

---

## Flags

`--role=<role>` — run a single role. Valid values: `db-engineer`, `web-perf`, `observability`, `test-architect`, `debt-analyst`, `refactoring`, `frontend`, `stream-processing`, `caching`, `distributed-systems`, `review-specialist`.

`--format=<format>` — `report` (default, markdown table) or `annotations` (JSON array for CI pipelines).

---

## Workflow

1. **Get the diff.** Run `git diff <base>...HEAD` and focus only on code visible in the diff. If no diff is available, ask the user to provide the code or diff to review.
2. **Select roles.** If `--role` is specified, load only that role's profile. Otherwise, identify which technical domains the diff touches and load the matching role profiles.
3. **Run each role independently.** For each role, read their profile in `role-profiles/` and examine the diff through that lens. One role's findings do not influence another.
4. **For each candidate finding**, require at least two pieces of supporting evidence before reporting. When in doubt, suppress.
5. **Emit the findings table.**
6. **Log the run.** Append an entry to `logs/YYYY-MM-DD.md` (create the file if it does not exist). Each entry contains:
   - Timestamp (HH:MM)
   - Domains touched and roles selected
   - Full findings table (copied verbatim)
   - Count of Blocking and Suggested findings

## Evidence requirement

Each finding requires at least two of:
- **Code evidence** — a specific line or expression in the diff that demonstrates the concern
- **Path evidence** — a reachable code path that would trigger the problem
- **Convention evidence** — nearby or sibling code that establishes the expected pattern this violates
- **Impact evidence** — a concrete description of what goes wrong if this ships

## Confidence calibration

| Confidence | Action |
|---|---|
| `high` | Report as `Blocking` or `Suggested` |
| `medium` | Suppress. Do not report. |
| `low` | Suppress. Do not report. |

## Output format

### `--format=report` (default)

A single markdown table. Title is the panel or role name. Columns: **Criticality**, **Role**, **Observation**, **Reasoning**. One row per finding, sorted Blocking → Suggested. Each cell is one concise sentence.

| Criticality | Role | Observation | Reasoning |
|---|---|---|---|
| Blocking | Database Engineer | `getUserOrders` at line 47 executes a query inside a loop over order IDs | Produces N+1 queries against the orders table — one per order ID rather than a single IN query |
| Blocking | Test Architect | The new `applyDiscount` branch has no test | A regression in discount calculation would pass CI undetected |
| Suggested | Refactoring Specialist | `processItems` at line 12 both validates and persists, violating single responsibility | Splitting into `validateItems` and `saveItems` would make each independently testable |

If no findings: `| — | — | No concerns raised. | — |`

Do not output prose, role sections, summaries, or recommendations. The table is the entire output. The user will ask follow-up questions for detail on any row.

### `--format=annotations`

A single JSON array. Each finding:

```json
{
  "skill": "code_review",
  "role": "db-engineer",
  "file": "src/orders.ts",
  "line": 47,
  "claim": "...",
  "evidence": ["...", "..."],
  "confidence": "high",
  "severity": "blocking",
  "suggested_fix": "..."
}
```