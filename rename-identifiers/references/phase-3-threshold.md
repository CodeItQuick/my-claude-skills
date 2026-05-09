# Phase 3 — Threshold: MEDIUM, HIGH, and CRITICAL

**Rename every identifier labeled CRITICAL, HIGH, MEDIUM, or LOW.**

Do not apply a count limit — if there are 20 CRITICAL identifiers, rename all 20. The label is the filter, not file size or gut feeling.

**Production code gets stricter scrutiny than tests.** An identifier in production that forces readers to trace call chains to understand its value is a higher-severity problem than the equivalent in a test, because it affects every future maintainer of the system. When in doubt, bias toward CRITICAL/HIGH for production identifiers.