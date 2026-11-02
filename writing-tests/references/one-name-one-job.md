# One helper name does one job

**Rule:** Two helpers with one name and two bodies are either a name clash or
a copy that drifted. A clash needs a rename. A drifted copy needs one helper,
and its difference can hide a defect.

**Apply it:** Do the two bodies do one job, so that a change to that job must
reach both? If yes, it is a copy: read the lines where the two differ, and ask
which one is right. If no, it is a name clash: rename one.

**Example:** `total` in the unit tests builds a `Money` value. `total` in the
component tests builds a cart summary row with `items`, `tax` and `shipping`.
Two layers, two shapes, so it was a clash, and a rename of one to `summaryOf`
fixed it.

**Backed in code:** the `sameName` warning in `scripts/validate-tests.mjs`
finds one function name with two bodies in spec files. The `copied` failure
finds identical bodies, but it misses a copy in `function` and arrow form, and
a copy that differs only in types.

**Evidence:** code_quality-48 (moderate) says that the cost of a copy is a
change that reaches one copy and not the other. code_quality-49 (moderate)
says that near-miss clones are more fault-prone than exact ones. Both support
the target, not the question. code_quality-52 grades "duplicated code must be
removed" as folklore. software_testing-59 (moderate) grades the detector.

**Found by:** two setup helpers had one name. One failed loudly on a refused
start, and the other returned quietly. "Which one is right?" points at the
loud copy, and that reaches the defect without a read of the callers. This
repository's instance is in `.claude/writing-tests/found-by.md`, where that
file exists.

**Why no script:** 12 names, 8 from snapshots across the fix commits in the
source repository and 4 in its shared support files:

| Class | Count |
|---|---|
| Name clash: one name, two jobs | 6 |
| Drifted copy: one job, two bodies | 2 |
| Missed copy: the same code in another syntax or with other types | 3 |
| Defect: a drifted copy whose difference lets a test pass with less | 1 |

The script is right 1 time in 12. It cannot tell one job from two.
