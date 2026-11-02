# The expected value is not the input

**Rule:** A name that is the input of a test must not also be its expected
value. If one name is both, the test cannot tell the rule from an echo of its
input.

**Apply it:** Is this name also the input that produces the result? If yes,
add a case whose input differs from the value that it expects. If no, the name
only hides the value: write the literal, with its source in a comment. Read
every use of the name in the file, not only the flagged line.

**Example:** a CORS test sends the allowed origin and expects it back:

```js
const ALLOWED_ORIGIN = 'http://localhost:5173';
const res = await get('/health', { origin: ALLOWED_ORIGIN });
expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
```

If the server config changes to reflect any origin, the request still sends
the allowed origin and gets it back, so the test passes. A request from
another origin tells the two apart.

**Backed in code:** the `namedLiteral` warning in `scripts/validate-tests.mjs`
finds a local name that holds a literal and is used as the expected value. It
reads only a `const` in column 0.

**Evidence:** No graded claim covers a name against a literal as the expected
value. code_quality-23 (strong) is about full words against abbreviations, not
about this. software_testing-59 (moderate) grades the detector.

**Found by:** a CORS test sent the allowed origin and expected the same origin
back. A later change wrote the expected side as a literal and kept the input,
so the warning cleared and the echo stayed. This repository's instance is in
`.claude/writing-tests/found-by.md`, where that file exists.

**Why no script:** the past hits, from snapshots across the fix commits in the
source repository:

| Class | Count |
|---|---|
| Hidden value: the name stands only for the expected literal | 5 |
| Echo: the same name is the input that produces the result | 2 |

All 7 hits are 2 names. The script is right on 2 of 7 for the echo. It cannot
see that a name feeds the request, because the request is built in a helper.
This is the local twin of the `importedExpected` failure, where the code and
the test read one constant.
