# Phase 5 — Execute

For each rename:

1. **Grep across the entire codebase** for all occurrences of the identifier before editing — source files, test files, type files, and barrel/index files. Partial renames are worse than none.
2. Rename the identifier in every file where it appears: production source, tests, and any re-export files.
3. Use `Edit` with `replace_all: true` for identifiers that appear multiple times in a file.
4. Rename one identifier at a time — don't batch multiple renames in one edit if it makes the diff unreadable.
5. Prefer word-boundary grep patterns (e.g., `\bidentifier\b`) to avoid spurious hits inside longer names, strings, or comments.
6. After all renames, re-read the changed sections in every affected file to confirm no occurrence was missed and no accidental collision was introduced (e.g., renaming `res` to `response` when `response` already exists in scope).
7. Check that renamed exports still match their import sites. If a public API name changes, update every consumer.
8. **If a class or module is renamed, rename its file too.** When a class name or the module's primary export changes, the filename must match. Rename the file using the shell (`mv` / `Rename-Item`), then update every `import` path across the codebase that referenced the old filename. Grep for the old filename stem (without extension) to find all consumers.