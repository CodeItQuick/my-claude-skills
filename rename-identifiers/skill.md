---
name: rename-identifiers
description: Rename poorly named variables, parameters, or identifiers across both test and production code. Triggers on "rename variables across the codebase", "fix names in production code", "rename identifiers everywhere", "bad variable names in source", or "rename across tests and source".
---

# Rename Identifiers

Hunt down the worst-named identifiers across test and production code and rename them everywhere they appear.

## Core Principle

An identifier's name is its contract. If a reader must trace the value through multiple call sites to understand what it holds, the name is wrong — whether it lives in a test or in production.

## Phases

Execute the phases in order. Load each reference file before starting that phase.

| Phase | Reference file | What it covers |
|-------|----------------|----------------|
| 1 | [references/phase-1-scope-and-read.md](references/phase-1-scope-and-read.md) | Identify scope and read all files in range |
| 1b | [references/phase-1b-identify-domain.md](references/phase-1b-identify-domain.md) | Extract the domain vocabulary |
| 2 | [references/phase-2-score-for-badness.md](references/phase-2-score-for-badness.md) | Label every identifier by severity |
| 3 | [references/phase-3-threshold.md](references/phase-3-threshold.md) | Decide what gets renamed |
| 4 | [references/phase-4-choose-replacements.md](references/phase-4-choose-replacements.md) | Pick domain-consistent replacement names |
| 5 | [references/phase-5-execute.md](references/phase-5-execute.md) | Apply all renames across every file |
| 6 | [references/phase-6-report.md](references/phase-6-report.md) | Produce the grouped summary |

Before executing, also load [references/constraints.md](references/constraints.md) for hard rules on what must never be done.