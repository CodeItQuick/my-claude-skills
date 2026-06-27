# Phase 1 — Scope and Read

1. Identify the target scope — one of four modes, detected as follows:
   - **PR diff** — the input contains `diff --git` headers or lines starting with `+++ b/`. Parse only the `+` lines (added or modified lines) from each hunk. Treat each file path in the diff header (`+++ b/<path>`) as the file being reviewed. Do not read files outside the diff. **Check for this first** — a diff may also contain file paths that would otherwise match the single-file or directory heuristics.
   - **Single file** — the input is a path to a specific file (e.g. `src/orders/service.ts`).
   - **Module directory** — the input is a directory path (e.g. `src/orders/`).
   - **Full codebase** — no input specified. Default when the user doesn't provide a scope.

2. Read every file in scope: source files, test files, type definition files, and index/barrel files. In diff mode, the "files" are the changed hunks — read only the `+` lines as the source of identifiers.
3. Build a list of every identifier: `const`/`let`/`var` declarations, function parameters, callback arguments, destructured names, class fields, and exported names.
4. Note what each one actually holds — not just its declared type, but its domain meaning in context.