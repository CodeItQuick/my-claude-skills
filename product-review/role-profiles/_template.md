# Reviewer: [Role Title]

<!--
File naming: kebab-case job title, e.g. data-engineer.md, legal-counsel.md, site-reliability-engineer.md

The Role Title above is the canonical name for this role. Use it verbatim in the
findings table Role column and in every log entry. Logged runs already contain
"QA", "QA / SDET", and "qa-sdet" for one role, and that inconsistency blocks
per-role aggregation. One spelling, everywhere.

Registration — the panel cannot select a role that skill.md does not know about:
1. Add a row to the "Available roles" table: role, key question, posture, time
   horizon, vantage, profile link. The "Their question is" sentence below doubles
   as the key question in that row.
2. Add a flag value to the `--role` mapping table.
3. If the role sits close to an existing role, add a disambiguation paragraph to
   "Panel selection" that says which of the two to pick and when. See the
   Growth Lead / Revenue Operations Analyst paragraph for the pattern.

Keep the profile under roughly 1,000 words — 1,300 for a generative profile,
whose fixed "Opportunity discovery" section costs about 230 of them. Profiles
load on every run that selects them, so length is a recurring cost.

Posture — decide this first; it determines the rest of the profile:

  Defensive (the default) — the role reads a diff for what should not ship. "What
  they look for" describes defects, risks, costs, or confusion. Findings are
  supported by impact evidence and emit Blocking / Suggested.

  Generative — the role reads a diff for what should exist next. "What they look
  for" describes leverage, adjacency, or unserved need. Findings are supported by
  leverage evidence and emit Opportunity only. A generative role must state in
  "Who this is" that it is not looking for defects, and name the defensive roles
  that own that ground. A generative profile also keeps the "Opportunity
  discovery" section below; a defensive profile deletes it.

Do not mix postures in one profile. A role that both critiques and proposes will
produce findings the criticality scale cannot represent — split it into two roles.
-->

## Who this is

<!--
Three elements, in order:

1. Their professional reality — what their job actually is, in one sentence. Ground it in
   what they own or are accountable for, not just their job title.

2. What they have been burned by — one or two specific experiences that shaped their
   instincts. "They have been burned by X" or "They know what happens when Y." This is
   what makes them suspicious of certain patterns. Be concrete: not "poor quality" but
   "the migration that looked fine until it hit production data."

   For a generative role, the burn is a missed opportunity, not a shipped defect:
   "They have watched three teams hand-roll the same retry loop" rather than "the
   outage that followed a bad deploy."

3. Their one-sentence question — the single question no other role in the panel would ask
   in quite the same way. Format: "Their question is: '[question]'" This sentence is
   reused verbatim as the key question in the skill.md role table.
-->

The [role] [owns / is responsible for / has seen] [professional reality]. They have been burned by [specific past experience that shaped their instinct]. They have [second experience if needed]. Their instinct is to ask: "[What is their gut-check question?]"

[Optional second paragraph: what they are NOT looking for — the scope boundary that distinguishes them from an adjacent role. Mandatory for a generative role: state that defects are out of scope and name the defensive roles that own them.]

Their question is: "[One sentence that no other panel member would ask in the same way.]"

---

## What they look for

<!--
4–7 concern categories. Each follows the same structure:
  - A bold heading (not numbered in the source — the ### provides the number visually)
  - One paragraph: name the concern, explain why it exists, state what the reviewer asks
  - "Look for:" followed by 3–6 bullet points of specific, concrete patterns

For a defensive role, a category names a risk and the bullets are its observable
signals. For a generative role, a category names a leverage pattern and each bullet
pairs a construct the diff could introduce with the capability it puts within reach —
leverage evidence needs both halves.

Headings should be noun phrases describing the category of concern, not verbs:
  Good: "Missing rollback path", "Scope that drifted from the stated problem"
  Avoid: "Check for missing rollback", "Look at whether scope drifted"

Every reported finding needs two evidence types drawn from the diff (see the
evidence requirement in skill.md). Write each bullet so it can be matched against
a specific diff line — a bullet that can never yield code, path, or convention
evidence will only ever produce suppressed findings. Avoid "things that might be
wrong"; describe the observable signal.
-->

### 1. [Concern category name]

[One paragraph: what this concern is, why this role cares about it, what question they are asking.]

Look for:
- [Specific observable pattern in a diff]
- [Specific observable pattern in a diff]
- [Specific observable pattern in a diff]
- [Specific observable pattern in a diff]

### 2. [Concern category name]

[One paragraph.]

Look for:
- [Specific observable pattern]
- [Specific observable pattern]
- [Specific observable pattern]

### 3. [Concern category name]

[One paragraph.]

Look for:
- [Specific observable pattern]
- [Specific observable pattern]
- [Specific observable pattern]

### 4. [Concern category name]

[One paragraph.]

Look for:
- [Specific observable pattern]
- [Specific observable pattern]
- [Specific observable pattern]

### 5. [Concern category name]

[One paragraph.]

Look for:
- [Specific observable pattern]
- [Specific observable pattern]
- [Specific observable pattern]

---

## Opportunity discovery (generative roles only)

<!--
Defensive profiles: delete this whole section. Generative profiles: keep it verbatim —
it is the procedure the role runs at review time, not authoring guidance. The
categories above say where to look; this section says how to search and what to keep.
-->

Diverge first, filter second. Do not evaluate while generating:

1. **Diverge.** List up to ten candidate opportunities the diff suggests, freely and
   without checking evidence. Weak candidates cost nothing at this step; an idea
   suppressed before it is written down is an idea never examined.
2. **Filter.** Keep only the candidates that survive the leverage evidence test — a
   specific construct in the diff, the named capability it puts within reach, and why
   that capability is materially cheaper now. Report at most three.

Tag every reported opportunity with an investment tier, named at the start of its
Reasoning cell:

- **Low** — capturable with roughly the effort of the diff itself: a script, a query,
  a config change, an export of something that already exists.
- **Medium** — a small project: days of work, a new surface or integration, some
  coordination across owners.
- **High** — a strategic build: weeks or more, reshapes what the product is or does.

The role's time horizon sets its center of gravity — a Now role mostly finds Low
opportunities, and a Later role exists to find High ones — but never report a single
tier when the candidates allow a spread. Within this role's vantage, the kept set
names the cheapest capture available from this diff and the most ambitious
opportunity that survives the filter.

---

## Suppression rules

<!--
Three types:

Hard suppress — always skip, no finding reported. Lead with the condition, follow with
the reason in one sentence. Format: "**[Condition].** [Why it does not apply.]"

Brief-grounded suppress — a hard suppress whose condition is a fact recorded in the
product brief (.product-review/brief.md) rather than in the diff. Format: "**The brief
records [fact].** [Why the role has nothing to say here.]" Example: "**The brief records
no billing code.** Metering findings cannot apply to a product that charges nothing."
If the role's relevance depends on what the product is — who uses it, what it charges,
what data it holds — write at least one of these, or the role will over-report on
repositories where it does not apply. Remember the asymmetry: a brief fact can
suppress a finding on its own, but can never support one. And if the role's case
depends on a fact in the brief's Unknowns section, suppress — unknown is not absent.

Soft suppress (downgrade) — reduce confidence to medium, which suppresses the finding
per the confidence calibration. Use when the concern is real but the evidence is weak,
the fix is disproportionate, or the author likely has context that makes it acceptable.
Format: "Downgrade to `medium` (suppress) when [condition]."

Aim for 3–5 hard suppress rules (brief-grounded ones included) and 1–2 soft suppress
rules. If you find yourself writing more than 6, the role's scope is probably too broad.
-->

Suppress findings when:
- **[Condition that makes the concern moot].** [One sentence explaining why.]
- **The brief records [fact that makes this role irrelevant].** [One sentence explaining why the role has nothing to say.]
- **[Condition].** [Reason.]

Downgrade to `medium` (suppress) when:
- [Condition where the concern is real but not strong enough to report]
- [Condition where the author likely has context that makes it acceptable]