---
name: making-a-skill-portable
description: Use when a skill in a repository's .claude/skills/ must also run in other codebases, when it is to move to $HOME/.claude/skills, or when a moved skill still names a path, ticket, commit, date, doc or sibling skill of the repository it came from. Also use when a skill cites claims from a ledger that the target codebase does not have.
---

# Making a Skill Portable

## Overview

A skill written in one repository holds that repository's facts: its test
folders, its tickets, its commits, its docs and its sibling skills. In
another codebase each fact is wrong or missing. The skill still reads as
complete, so nobody notices.

**Confirmed baseline:** `scan-ties.mjs` on `writing-tests` before its move
found 179 ties: 68 repository paths, 38 dates, 33 tickets, 26 commits, 11
sibling skills and 3 repository docs. After the move it found 0. One script,
`validate-tests.mjs`, hard-coded the four test roots, so it read nothing in
another codebase.

**Status: draft.** This skill comes from one run, on `writing-tests` and
`writing-test-heuristics`. A second run is due before the next skill moves.

The method is **one core, one overlay**:

- **The core** travels: rules, scripts, their tests, the heuristic questions,
  and the evidence that the rules cite. It lives in `$HOME/.claude/skills`.
- **The overlay** stays: baselines, run commands, seams with local skills,
  examples, and the provenance of each rule. It lives in
  `.claude/<skill>/` in each repository.

Two full copies drift. One core with one overlay per repository does not.

## When to Use

- "Move this skill to my global skills"
- "I want to use this skill in another codebase"
- A skill's script finds nothing in a new repository
- A moved skill cites a ticket, a path or a skill that does not exist there

Not for: a skill that has no repository facts. Copy it. Also not for writing
a new skill (that is `superpowers:writing-skills`, or the repository's own
skill for writing skills).

## Invariants

Check with:

```bash
node $HOME/.claude/skills/making-a-skill-portable/scripts/scan-ties.mjs <core dir> <source repo> [--with <skill>]
node $HOME/.claude/skills/making-a-skill-portable/scripts/bundle-claims.mjs <core dir> <ledger dir> --check
```

- **The core has 0 ties to the source repository.** The scanner reads all of
  each Markdown file, and only the comments of each script. A date in test
  data is an input, not a tie. Name a skill that moves with this one in
  `--with`.
- **Every claim that the core cites resolves inside the core.**
  `bundle-claims.mjs` copies each cited ledger row into
  `references/evidence.md`. The ledger is a Markdown table with rows that
  start `| <area>-<number> |` and a `## Sources` list.
- **A script finds the repository's files by config or by discovery, never
  by a hard-coded path.** The config is `.claude/<skill>/config.json`.
  Without it, the script scans the working directory.
- **A script finds a sibling skill relative to its own file.** Use
  `import.meta.url`, not the repository root.
- **The overlay is the only home of a repository fact.** The core says: if
  `.claude/<skill>/project.md` exists, read it first.

## Process

Each step is one commit. Steps 1 and 2 only read.

### 1. Inventory

```bash
node $HOME/.claude/skills/making-a-skill-portable/scripts/scan-ties.mjs .claude/skills/<skill> . --with <companion>
```

The scanner counts the mechanical ties. Then read for the ties that it cannot
count:

- a script that reads fixed folders
- runner or framework syntax that the target codebases do not use
- examples taken from this repository's code
- rules whose only reason is a ticket in this repository

Write the inventory and the plan to a note in the source repository.

### 2. Stop and ask

Report the inventory and the plan. Ask the user three questions:

1. Where does the core live? The default is `$HOME/.claude/skills`.
2. Which runners, frameworks and languages do the target codebases use?
3. Which skills move with this one?

Do not edit a file before the answers.

### 3. Discovery and runners

Replace each hard-coded path in a script with the config file, and discover
the files when there is no config. Add a test for both. Add the target
runners' syntax to each pattern, with a test for each form.

### 4. Evidence

```bash
node $HOME/.claude/skills/making-a-skill-portable/scripts/bundle-claims.mjs .claude/skills/<skill> <ledger dir>
```

Run it again with `--check`. A short id such as "software_testing-121 and
-122" counts. A skill that moves with this one can cite the same
`evidence.md`.

### 5. Overlay

Make `.claude/<skill>/project.md`. Move into it the baselines, run commands,
helper folders, seams with local skills, and dated scope history. Move each
"Found by" entry to `.claude/<skill>/found-by.md`, and keep a general
sentence in the core. Add a "The project file" section to the core
`SKILL.md`.

### 6. Examples and comments

Rewrite each repository example as a neutral snippet that keeps its lesson.
Remove each ticket id and date from the script comments. Keep the claim ids,
because they resolve in `evidence.md`.

### 7. Move

1. Copy the core folders to `$HOME/.claude/skills`.
2. Rewrite each command path to `$HOME/.claude/skills/<skill>/...`.
3. Run the tests from the skill folder. Node finds no test when the glob
   starts with a Git Bash path such as `/c/Users`.
4. Run the scanner on the copy. The count must be 0.
5. Remove the repository copy with `git rm`. Repoint the other local skills
   that name it.
6. Remove a path-scoped rule in `.claude/rules/` whose folder moved.
7. Commit in the skills repository and in the source repository.

### 8. Prove it

Run the core on one other codebase with no overlay. Each question that it
cannot answer is a gap. Fix the gap in the core, or add a key to the
overlay.

## Common Mistakes

- **A multi-line pattern with the wrong line ending.** Some files were CRLF.
  A pattern with `\n` matched nothing. Make each replacement fail when its
  pattern does not match exactly once.
- **`git add` on a path that `git rm` staged.** The add fails, and the whole
  commit with it. Add only the changed files.
- **A validator that resolves a named skill as a sibling.** The repository's
  `validate-skill.mjs` read `$HOME/.claude/skills/x/` as a sibling folder,
  and failed every local skill that named the moved one.
- **A one-word skill name in the scanner.** A skill named `break` matched the
  JavaScript keyword. The scanner counts only hyphenated names.
- **A script that finds a sibling from the repository root.** The heuristics
  validator found `writing-tests` through `.claude/skills/`. After the move,
  that path did not exist.
- **Leaving a banned word in copied prose.** The heuristic files held "would"
  in two questions. Read the copied prose against the house rules.
