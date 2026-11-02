import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkFile, definitionsIn, duplicatedHelpers, duplicatedTests, main, sameNameHelpers } from './validate-tests.mjs';

const filesOf = sources => new Map(Object.entries(sources).map(([file, source]) => [file, definitionsIn(source)]));
const inTest = body => `it('does one thing', () => {\n${body}\n});\n`;
const findingsOf = source => checkFile('s.test.ts', source);

const CONTROL_FLOW = {
    'if': 'if (ready) expect(a).toBe(1);',
    'switch': 'switch (kind) { case 1: go(); }\nexpect(a).toBe(1);',
    'try/catch': 'try { parse(bad); } catch (error) { expect(error).toBe(1); }',
    'ternary': 'expect(score).toBe(reversed ? 2 : 4);',
    '|| fallback': 'expect(a || b).toBe(1);',
    '?? fallback': 'expect(a ?? b).toBe(1);',
    'for': 'for (const x of xs) expect(x).toBe(1);',
    'while': 'while (more()) next();\nexpect(a).toBe(1);',
    'forEach': 'xs.forEach(x => expect(x).toBe(1));',
};

for (const [name, body] of Object.entries(CONTROL_FLOW)) {
    test(`${name} inside a test body is a failure`, () => {
        assert.deepEqual(findingsOf(inTest(body)).failures, [
            `s.test.ts:2: ${name} inside a test body (test starts line 1)`,
        ]);
    });
}

test('an if and its else inside a test body are two failures', () => {
    assert.deepEqual(findingsOf(inTest('if (ready) go();\nelse stop();\nexpect(a).toBe(1);')).failures, [
        's.test.ts:2: if inside a test body (test starts line 1)',
        's.test.ts:3: else inside a test body (test starts line 1)',
    ]);
});

test('a loop in a describe body around the tests is parameterisation, not a failure', () => {
    const source = "describe('banks', () => {\n    for (const bank of banks) {\n        it(bank.name, () => { expect(bank).toBe(1); });\n    }\n});\n";

    assert.deepEqual(findingsOf(source).failures, []);
});

test('control flow in a module-level helper is a warning, not a failure', () => {
    const source = 'function answer(question) {\n    if (question.likert) return 3;\n    return 0;\n}\n' + inTest('expect(answer(q)).toBe(0);');

    const result = findingsOf(source);

    assert.deepEqual(result.failures, []);
    assert.deepEqual(result.warnings, ['s.test.ts:2: if in a test-file helper (helper starts line 1)']);
});

test('a typed arrow helper is read as a helper', () => {
    const source = 'const choose: Strategy = question => question.likert ? 3 : 0;\n';

    assert.deepEqual(findingsOf(source).warnings, ['s.test.ts:1: ternary in a test-file helper (helper starts line 1)']);
});

test('an object type on a helper parameter does not hide the helper body', () => {
    const source = 'function order(ordered: ReadonlyArray<{ factor: string }>) {\n    if (ordered.length) return 1;\n}\n';

    assert.deepEqual(findingsOf(source).warnings, ['s.test.ts:2: if in a test-file helper (helper starts line 1)']);
});

test('keywords inside comments and strings are not control flow', () => {
    const source = inTest("// if (x) this would branch\nexpect(label).toBe('if (x) or y || z');");

    assert.deepEqual(findingsOf(source).failures, []);
});

test('a Playwright test body after a destructured parameter is checked', () => {
    const source = "test('opens', async ({ page }) => {\n    if (await page.isVisible()) await expect(page).toHaveTitle('x');\n});\n";

    assert.deepEqual(findingsOf(source).failures, ['s.test.ts:2: if inside a test body (test starts line 1)']);
});

test('a test written with a function callback is checked', () => {
    const source = "it('opens', function () {\n    if (open) expect(a).toBe(1);\n});\n";

    assert.deepEqual(findingsOf(source).failures, ['s.test.ts:2: if inside a test body (test starts line 1)']);
});

test('a test with an expression body is checked', () => {
    const source = "it('scores', () => expect(a || b).toBe(1));\n";

    assert.deepEqual(findingsOf(source).failures, ['s.test.ts:1: || fallback inside a test body (test starts line 1)']);
});

test('a regex .test( call is not a test', () => {
    const result = findingsOf(inTest('expect(/^Maps/.test(description)).toBe(true);'));

    assert.deepEqual(result.bodies.map(body => body.at), ['s.test.ts:1']);
});

test('test.skip with a condition inside a test is not a second test', () => {
    const source = "test('a survey', async ({ page }) => {\n    test.skip(likert === undefined, 'no survey');\n    await expect(page).toHaveTitle('x');\n});\n";

    assert.deepEqual(findingsOf(source).bodies.map(body => body.at), ['s.test.ts:1']);
});

const WEAK = {
    'toBeDefined()': 'expect(session).toBeDefined();',
    'toBeTruthy()': 'expect(session).toBeTruthy();',
    'toBeFalsy()': 'expect(session).toBeFalsy();',
    'expect(typeof …)': "expect(typeof session).toBe('object');",
    'length > 0': 'expect(list.length).toBeGreaterThan(0);',
    'chai ok/exist': 'expect(session).to.be.ok;',
};

for (const [name, line] of Object.entries(WEAK)) {
    test(`${name} inside a test is a weak assertion`, () => {
        assert.deepEqual(findingsOf(inTest(line)).weak, [`s.test.ts:2: ${name}`]);
    });
}

const AMBIENT = {
    'Date.now()': 'session.createdAt = Date.now();\nexpect(store.size).toBe(1);',
    'new Date()': 'session.createdAt = new Date();\nexpect(store.size).toBe(1);',
    'Math.random()': 'const pick = Math.random();\nexpect(store.size).toBe(1);',
};

for (const [name, body] of Object.entries(AMBIENT)) {
    test(`${name} inside a test is ambient state`, () => {
        assert.deepEqual(findingsOf(inTest(body)).ambient, [
            `s.test.ts:2: ${name} inside a test body, and the file does not control it`,
        ]);
    });
}

test('the clock is controlled when the file uses fake timers', () => {
    const source = 'beforeEach(() => vi.useFakeTimers());\n' + inTest('session.createdAt = Date.now();\nexpect(store.size).toBe(1);');

    assert.deepEqual(findingsOf(source).ambient, []);
});

test('a fixed date is not ambient state', () => {
    const source = inTest("session.createdAt = new Date('2026-11-01');\nexpect(store.size).toBe(1);");

    assert.deepEqual(findingsOf(source).ambient, []);
});

test('the random draw is controlled when the file spies on Math.random', () => {
    const source = "beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0));\n" + inTest('const pick = Math.random();\nexpect(pick).toBe(0);');

    assert.deepEqual(findingsOf(source).ambient, []);
});

test('fake timers do not control the random draw', () => {
    const source = 'beforeEach(() => vi.useFakeTimers());\n' + inTest('const pick = Math.random();\nexpect(store.size).toBe(1);');

    assert.deepEqual(findingsOf(source).ambient, ['s.test.ts:3: Math.random() inside a test body, and the file does not control it']);
});

test('ambient state outside a test is not reported', () => {
    const source = 'const STARTED = Date.now();\n' + inTest('expect(STARTED).toBe(1);');

    assert.deepEqual(findingsOf(source).ambient, []);
});

test('waitForTimeout inside a test is a fixed sleep', () => {
    const source = "test('answers', async ({ page }) => {\n    await page.waitForTimeout(600);\n    await expect(page).toHaveTitle('x');\n});\n";

    assert.deepEqual(findingsOf(source).sleeps, ['s.test.ts:2: waitForTimeout() inside a test body']);
});

test('setTimeout inside a test is a fixed sleep', () => {
    const source = inTest('await new Promise(resolve => setTimeout(resolve, 1_500));\nexpect(a).toBe(1);');

    assert.deepEqual(findingsOf(source).sleeps, ['s.test.ts:2: setTimeout() inside a test body']);
});

test('setTimeout under fake timers is not a sleep', () => {
    const source = 'beforeEach(() => vi.useFakeTimers());\n' + inTest('setTimeout(tick, 1_000);\nexpect(a).toBe(1);');

    assert.deepEqual(findingsOf(source).sleeps, []);
});

test('fake timers do not excuse waitForTimeout', () => {
    const source = "beforeEach(() => vi.useFakeTimers());\ntest('answers', async ({ page }) => {\n    await page.waitForTimeout(600);\n    await expect(page).toHaveTitle('x');\n});\n";

    assert.deepEqual(findingsOf(source).sleeps, ['s.test.ts:3: waitForTimeout() inside a test body']);
});

test('a test with no assertion is reported on its first line', () => {
    assert.deepEqual(findingsOf(inTest('store.create(1);')).unasserted, ['s.test.ts:1: test has no assertion']);
});

test('an assertion word in a comment does not count as an assertion', () => {
    assert.deepEqual(findingsOf(inTest('// expect(a).toBe(1)\nstore.create(1);')).unasserted, ['s.test.ts:1: test has no assertion']);
});

const ASSERTING = {
    'expect': 'expect(a).toBe(1);',
    'expect.poll': 'await expect.poll(() => a).toBe(1);',
    'node assert': 'assert.equal(a, 1);',
    'a helper named for an assertion': 'expectScore(page, 3);',
    'chai should': 'a.should.equal(1);',
};

for (const [name, body] of Object.entries(ASSERTING)) {
    test(`a test that asserts with ${name} has an assertion`, () => {
        assert.deepEqual(findingsOf(inTest(body)).unasserted, []);
    });
}

const FOLDED = {
    'expect(a === b).toBe(true)': 'expect(a === b).toBe(true);',
    'expect(a !== b).toBe(false)': 'expect(a !== b).toBe(false);',
    'expect(a > b).toBeTruthy()': 'expect(a > b).toBeTruthy();',
    'expect(a <= b).not.toEqual(false)': 'expect(a <= b).not.toEqual(false);',
    'assert(a === b)': 'assert(a === b);',
    'assert.ok(a < b)': 'assert.ok(a < b);',
};

for (const [name, line] of Object.entries(FOLDED)) {
    test(`${name} folds a comparison into a boolean`, () => {
        assert.deepEqual(findingsOf(inTest(line)).folded, [
            's.test.ts:2: comparison inside the assertion; compare with a matcher so a failure shows both values',
        ]);
    });
}

const NOT_FOLDED = {
    'a matcher comparison': 'expect(a).toBe(b);',
    'a comparison nested in a call': 'expect(count(a === b)).toBe(true);',
    'an arrow inside the subject': 'expect(xs.filter(x => x)).toEqual([]);',
    'a comparison with a non-boolean matcher': 'expect(a === b).toEqual(answer);',
    'a comparison in an assert message': "assert.equal(total, 3, 'a < b');",
};

for (const [name, line] of Object.entries(NOT_FOLDED)) {
    test(`${name} is not a folded comparison`, () => {
        assert.deepEqual(findingsOf(inTest(line)).folded, []);
    });
}

test('one test body written twice in one file is a duplicate', () => {
    const source = "it('first', () => {\n    expect(a).toBe(1);\n});\nit('second', () => {\n    expect(a).toBe(1); // the same\n});\n";

    assert.deepEqual(duplicatedTests(findingsOf(source).bodies), ['same test body at s.test.ts:1, s.test.ts:4']);
});

test('two test bodies that differ in a literal are not duplicates', () => {
    const source = "it('first', () => {\n    expect(a).toBe('x');\n});\nit('second', () => {\n    expect(a).toBe('y');\n});\n";

    assert.deepEqual(duplicatedTests(findingsOf(source).bodies), []);
});

test('one test body in two files is not a duplicate, since imports can make them differ', () => {
    const bodies = [
        ...checkFile('agile.test.ts', inTest('expect(bank).toHaveLength(400);')).bodies,
        ...checkFile('devops.test.ts', inTest('expect(bank).toHaveLength(400);')).bodies,
    ];

    assert.deepEqual(duplicatedTests(bodies), []);
});

test('a helper renamed in its second spec file is still a copy', () => {
    const files = filesOf({
        'a.test.ts': 'function startQuiz(page) {\n    return page.click("#start");\n}\n',
        'b.test.ts': 'function beginQuiz(page) {\n    // the same, renamed\n    return page.click("#start");\n}\n',
    });

    assert.deepEqual(duplicatedHelpers(files), [
        'startQuiz / beginQuiz: same body in 2 spec files — a.test.ts, b.test.ts',
    ]);
});

test('a constant that differs only in its string is not a copy', () => {
    const files = filesOf({
        'a.test.ts': "const HOST = 'http://a';\n",
        'b.test.ts': "const HOST = 'http://b';\n",
    });

    assert.deepEqual(duplicatedHelpers(files), []);
});

test('a constant computed from imports is not compared', () => {
    const files = filesOf({
        'a.test.js': 'const require = createRequire(import.meta.url);\nconst bank = [...juniorQuestions];\n',
        'b.test.js': 'const require = createRequire(import.meta.url);\nconst bank = [...juniorQuestions];\n',
    });

    assert.deepEqual(duplicatedHelpers(files), []);
});

test('one helper name with two bodies is a warning, not a copy', () => {
    const files = filesOf({
        'a.test.js': 'async function sit(count) {\n    return count;\n}\n',
        'b.test.js': 'async function sit(playerId, count) {\n    return [playerId, count];\n}\n',
    });

    assert.deepEqual(duplicatedHelpers(files), []);
    assert.deepEqual(sameNameHelpers(files), ['sit: different bodies in 2 spec files — a.test.js, b.test.js']);
});

test('an expected value imported from src is reported, and one from support is not', () => {
    const source = "import { LIMIT } from '../src/caps.js';\nimport { HOST } from './support/api';\n"
        + inTest('expect(cap).toBe(LIMIT);\nexpect(url).toBe(HOST);');

    assert.deepEqual(findingsOf(source).importedExpected, [
        's.test.ts:4: LIMIT is imported from ../src/caps.js, the code under test; write the expected value as a literal',
    ]);
});

test('a camelCase import is an object, so a toBe on it is an identity check', () => {
    const source = "import { backendTrack } from '../src/role-track.js';\n" + inTest('expect(track).toBe(backendTrack);');

    assert.deepEqual(findingsOf(source).importedExpected, []);
});

test('a local literal const is reported as the expected value, and an object const is not', () => {
    const source = "const SITTING = 99;\nconst SAVED = { id: 1 };\n"
        + inTest('expect(total).toBe(SITTING);\nexpect(read).toEqual(SAVED);');

    assert.deepEqual(findingsOf(source).namedLiterals, [
        's.test.ts:4: SITTING names a literal; write the literal as the expected value',
    ]);
});

test('a chai boolean collapses a call the same way a Vitest one does', () => {
    assert.deepEqual(findingsOf(inTest('expect(ids.some(id => id > 1)).to.eq(true);')).weak, [
        's.test.ts:2: expect(x.some(…)) collapses to a boolean; compare the value with a matcher so a failure shows it',
    ]);
});

/**
 * Runs `main` on a fresh folder that holds `files`, with the report silenced.
 * The test context restores `console.log` and removes the folder afterwards.
 */
function exitCodeFor(context, files) {
    const folder = mkdtempSync(join(tmpdir(), 'validate-tests-'));
    context.after(() => rmSync(folder, { recursive: true }));
    context.mock.method(console, 'log', () => {});
    Object.entries(files).forEach(([name, source]) => writeFileSync(join(folder, name), source));

    return main(['node', 'validate-tests.mjs', folder]);
}

const FAILING_FILES = {
    'control flow': inTest('if (a) expect(a).toBe(1);'),
    'ambient state': inTest('const now = Date.now();\nexpect(a).toBe(1);'),
    'a fixed sleep': inTest('setTimeout(done, 10);\nexpect(a).toBe(1);'),
    'no assertion': inTest('store.create(1);'),
    'a folded comparison': inTest('expect(a === b).toBe(true);'),
    'a test written twice': inTest('expect(a).toBe(1);') + inTest('expect(a).toBe(1);'),
};

for (const [name, source] of Object.entries(FAILING_FILES)) {
    test(`a file with ${name} fails the run`, context => {
        assert.equal(exitCodeFor(context, { 's.test.ts': source }), 1);
    });
}

test('a helper copied into two spec files fails the run', context => {
    const helper = 'function startQuiz(page) {\n    return page.click("#start");\n}\n';

    assert.equal(exitCodeFor(context, { 'a.test.ts': helper, 'b.test.ts': helper }), 1);
});

test('a clean file passes the run, weak assertions included', context => {
    assert.equal(exitCodeFor(context, { 's.test.ts': inTest('expect(session).toBeDefined();') }), 0);
});
