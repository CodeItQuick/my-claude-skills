# A console line in a test is a defect when no assert checks what it prints

**Rule:** A `console.log` in a test is an echo when an assert already checks
the value that it prints. It is a defect when the test reads a behavior, prints
it, and checks nothing.

**Apply it:** Delete the console line. Does an assert still check each value
that it printed, or each part of that value that the test title names? If yes,
the line is an echo: delete it. If no, the test reads the behavior and does
not check it: that is a defect.

**Backed in code:** the `logged` warning in `scripts/validate-tests.mjs` finds
`console.log`, `.debug` and `.info` in a test body.

**Evidence:** No graded claim covers console output in a test.
software_testing-59 (moderate) grades the detector.

**Found by:** a browser test computed whether reduced motion was on, logged
the value, and asserted nothing about it. The same count found two partial
checks in the same file. This repository's instance is in
`.claude/writing-tests/found-by.md`, where that file exists.

**Why no script:** the past hits, from snapshots across the fix commits in the
source repository:

| Class | Count |
|---|---|
| Echo: an assert checks the whole printed value | 5 |
| Input dump: prints an input, and the asserts check the named part | 1 |
| Partial: a printed field that the title names, and no assert checks it | 2 |
| Probe only: printed, never asserted | 1 |

The script is right 3 times in 9. It cannot match a printed value to the
asserts that check it, or to the test title.
