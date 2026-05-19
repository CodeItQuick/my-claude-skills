---
name: rename-identifiers
description: Rename poorly named variables, parameters, or identifiers across both test and production code. Triggers on "rename variables across the codebase", "fix names in production code", "rename identifiers everywhere", "bad variable names in source", or "rename across tests and source".
---

# Rename Identifiers

Hunt down the worst-named identifiers across test and production code and rename them everywhere they appear.

## Flags

`--min-severity=<level>` — restrict the report to findings at or above the specified severity. Valid values: `CRITICAL`, `HIGH`, `MEDIUM` (default: `MEDIUM`, meaning all findings are surfaced).

`--format=<format>` — control output format. Valid values: `report` (default, grouped human-readable output), `annotations` (JSON object with a `summary` string and a `findings` array, machine-parseable). Use `annotations` in CI pipelines so output can be consumed by build scripts or posted as PR review comments.

Example CI invocation: `/rename-identifiers --min-severity=HIGH --format=annotations`

---

## Core Principle

An identifier's name is its contract. Every bad name fails for exactly one reason — and that reason determines the fix. Classify first, then apply the fix rule for that category.

## Naming Failure Taxonomy

Ten disjoint categories, evaluated in priority order (LIE → VOID → INVERSE → CHIMERA → MIMIC → CIPHER → FRAGMENT → SERIES → MIRAGE → ECHO):

| Category | Severity | Root cause | Fix rule |
|----------|----------|------------|----------|
| **LIE** | CRITICAL | False information | Name the true type, cardinality, and domain role |
| **VOID** | CRITICAL | No information | Name what it actually holds |
| **INVERSE** | HIGH | Inverted boolean polarity | Invert both the value and the name together |
| **CHIMERA** | HIGH | Incoherent term combination | Find the single real concept from the implementation |
| **MIMIC** | HIGH | Implementation exposed instead of concept | Replace with the domain concept name |
| **CIPHER** | HIGH | Abbreviation with a recoverable expansion | Spell it out |
| **FRAGMENT** | MEDIUM | Structural role without domain qualification | Qualify with a domain noun |
| **SERIES** | MEDIUM | Ordinal position instead of concept | Name each item's distinct role |
| **MIRAGE** | MEDIUM | Wrong scope generality | Match the name's implied reach to its actual reach |
| **ECHO** | MEDIUM | Ambiguous domain term | Qualify to pin to one concept |

---

## Phases

Execute the phases in order.

## Phase 1 — Scope and Read

See `references/phase-1-scope-and-read.md`.

Read every file in scope and build a list of every identifier with its domain meaning. Keep a running count — you will need the total in Phase 6.

---

## Phase 1b — Identify the Domain

See `references/phase-1b-identify-domain.md` for full rules and techniques.

Establish the domain vocabulary before classifying any name. Existing identifiers are suspects, not authorities — read implementations to discover what concepts the code actually models. Every replacement must draw from this vocabulary.

---

## Phase 2 — Classify Each Identifier

See `references/phase-2-score-for-badness.md` for full detection rules and examples.

Assign every candidate the first matching category in priority order: **LIE → VOID → INVERSE → CHIMERA → MIMIC → CIPHER → FRAGMENT → SERIES → MIRAGE → ECHO**. Class and function names are not exempt. Skip loop counters, universally understood abbreviations (`id`, `url`, `html`, `json`, `err`), and names that are genuinely unambiguous in context.

---

## Phase 3 — Threshold

See `references/phase-3-threshold.md`.

Rename every identifier that received a category. No count limit. Production code gets stricter scrutiny than tests.

---

## Phase 4 — Choose Good Replacements

See `references/phase-4-choose-replacements.md`.

Apply the fix rule for the assigned category. All replacements must use domain vocabulary from Phase 1b. A structurally correct name that uses terms foreign to the domain is still a bad name.

---

## Phase 5 — Report

See `references/phase-5-shared.md` first, then the format-specific file:

- `--format=report` (default) → `references/phase-5-report.md`
- `--format=annotations` → `references/phase-5-annotations.md`

---

## Phase 6 — Log

Append an entry to `logs/YYYY-MM-DD.md` (create the file if it does not exist). Each entry contains:
- Timestamp (HH:MM)
- Scope reviewed (file, module, or full codebase)
- Total identifiers scanned
- Count of findings per category (LIE, VOID, INVERSE, etc.)
- Count of findings per severity (CRITICAL, HIGH, MEDIUM)
- Full report output (copied verbatim)

---

## Constraints — What NOT to Do

See `references/constraints.md`.