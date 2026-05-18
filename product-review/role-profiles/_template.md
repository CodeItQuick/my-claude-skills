# Reviewer: [Role Title]

<!--
File naming: kebab-case job title, e.g. data-engineer.md, legal-counsel.md, site-reliability-engineer.md
Register the role in skill.md: add a row to the relevant panel table, or create a new panel section.
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

3. Their one-sentence question — the single question no other role in the panel would ask
   in quite the same way. Format: "Their question is: '[question]'"
-->

The [role] [owns / is responsible for / has seen] [professional reality]. They have been burned by [specific past experience that shaped their instinct]. They have [second experience if needed]. Their instinct is to ask: "[What is their gut-check question?]"

[Optional second paragraph: what they are NOT looking for — the scope boundary that distinguishes them from an adjacent role.]

Their question is: "[One sentence that no other panel member would ask in the same way.]"

---

## What they look for

<!--
4–7 concern categories. Each follows the same structure:
  - A bold heading (not numbered in the source — the ### provides the number visually)
  - One paragraph: name the concern, explain why it exists, state what the reviewer asks
  - "Look for:" followed by 3–6 bullet points of specific, concrete patterns

Headings should be noun phrases describing the category of concern, not verbs:
  Good: "Missing rollback path", "Scope that drifted from the stated problem"
  Avoid: "Check for missing rollback", "Look at whether scope drifted"

Bullet points should be specific enough that a reviewer knows immediately whether
the pattern applies to the diff in front of them. Avoid "things that might be wrong" —
describe the observable signal.
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

## Suppression rules

<!--
Two types:

Hard suppress — always skip, no finding reported. Lead with the condition, follow with
the reason in one sentence. Format: "**[Condition].** [Why it does not apply.]"

Soft suppress (downgrade) — reduce confidence to medium, which suppresses the finding
per the confidence calibration. Use when the concern is real but the evidence is weak,
the fix is disproportionate, or the author likely has context that makes it acceptable.
Format: "Downgrade to `medium` (suppress) when [condition]."

Aim for 3–5 hard suppress rules and 1–2 soft suppress rules. If you find yourself
writing more than 6, the role's scope is probably too broad.
-->

Suppress findings when:
- **[Condition that makes the concern moot].** [One sentence explaining why.]
- **[Condition].** [Reason.]
- **[Condition].** [Reason.]

Downgrade to `medium` (suppress) when:
- [Condition where the concern is real but not strong enough to report]
- [Condition where the author likely has context that makes it acceptable]