import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proseOf, tiePatterns, tiesIn } from './scan-ties.mjs';

const patterns = tiePatterns({ folders: ['server'], docs: ['jira.md'], skills: ['adding-a-quiz'] });
const found = text => tiesIn(text, patterns).map(tie => `${tie.category}: ${tie.text}`);

test('finds each kind of tie in prose', () => {
    assert.deepEqual(found('See server/tests/app.test.js, QUIZ-12, `84edef7`, jira.md, adding-a-quiz, on 2026-11-01.'), [
        'ticket: QUIZ-12',
        'commit: `84edef7`',
        'date: 2026-11-01',
        'repo path: server/tests/app.test.js',
        'repo doc: jira.md',
        'repo skill: adding-a-quiz',
    ]);
});

test('a global skills path and a claim id are not ties', () => {
    assert.deepEqual(found('Run $HOME/.claude/skills/x/server/a.mjs for software_testing-97.'), []);
});

test('reads only the comments of a script', () => {
    // Built at run time, so that the scanner does not read this fixture as a comment.
    const slashes = '/'.repeat(2);
    const script = `const when = new Date('2026-11-01');\n${slashes} cleared on 2026-11-02\n * QUIZ-5\n`;
    assert.equal(proseOf('a.mjs', script), `\n${slashes} cleared on 2026-11-02\n * QUIZ-5\n`);
});
