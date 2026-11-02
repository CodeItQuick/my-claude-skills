import { describe } from 'node:test';
import { check, code, fails, passes, spec } from './validator-cli.mjs';

describe('7. What the validator reads as a test', () => {
    describe('the test callback', () => {
        check('reads a Playwright body after the destructured { page }', spec`
            test('opens the quiz', async ({ page }) => {
                if (await page.isVisible('#start')) await expect(page).toHaveTitle('Quiz');
            });
        `, fails(1, { controlFlow: ['spec.test.ts:2: if inside a test body (test starts line 1)'] }));

        check('reads a function callback', spec`
            it('opens the quiz', function () {
                if (open) expect(page.title).toBe('Quiz');
            });
        `, fails(1, { controlFlow: ['spec.test.ts:2: if inside a test body (test starts line 1)'] }));

        check('reads an arrow with an expression body', spec`
            it('scores an answer', () => expect(answer.score || 0).toBe(1));
        `, fails(1, { controlFlow: ['spec.test.ts:1: || fallback inside a test body (test starts line 1)'] }));

        check('reads it.only, it.skip and test.fixme as tests', spec`
            it.only('scores a correct answer', () => {
                if (answer.correct) expect(score).toBe(1);
            });

            it.skip('scores a wrong answer', () => {
                if (!answer.correct) expect(score).toBe(0);
            });

            test.fixme('scores a skipped answer', () => {
                if (answer.skipped) expect(score).toBe(0);
            });
        `, fails(1, {
            controlFlow: [
                'spec.test.ts:2: if inside a test body (test starts line 1)',
                'spec.test.ts:6: if inside a test body (test starts line 5)',
                'spec.test.ts:10: if inside a test body (test starts line 9)',
            ],
            focused: ['spec.test.ts:1: .only runs this and skips every other test in the file'],
        }));
    });

    describe('code that is not a test body', () => {
        check('passes on keywords inside comments and strings', spec`
            it('labels the branch', () => {
                // if (x) this would branch
                expect(label).toBe('if (x) or y || z');
            });
        `, passes(1));

        check('passes on a regex .test( call, which is not a test', spec`
            it('names what the score measures', () => {
                expect(/^Measures/.test(description)).toBe(true);
            });
        `, passes(1));

        check('passes on test.skip(condition) inside a test, which is not a second test', spec`
            test('plays a survey', async ({ page }) => {
                test.skip(survey === undefined, 'no branch starts a survey');
                await expect(page).toHaveTitle('Survey');
            });
        `, passes(1));

        check('passes on control flow in a describe body outside any test', spec`
            describe('banks', () => {
                if (process.env.FULL) {
                    it('holds 400 questions', () => {
                        expect(bank).toHaveLength(400);
                    });
                }
            });
        `, passes(1));

        check('passes on Date.now() at module level, which no test body holds', spec`
            const STARTED = Date.now();

            it('records the start', () => {
                expect(startedAt()).toBe(STARTED);
            });
        `, passes(1));

        check('reads no file that is not named .test or .spec', {
            'support/answers.ts': code`
                export function answerFor(question) {
                    if (question.likert) return 3;
                    return 0;
                }
            `,
        }, passes(0));
    });

    describe('the files a run reads when no path is named', () => {
        const branching = code`
            it('scores an answer', () => {
                if (answer.correct) expect(score).toBe(1);
            });
        `;
        const NO_PATH = [];

        check('reads every test file under the working directory', {
            'src/score.test.ts': branching,
            'test/score.spec.jsx': branching,
        }, fails(2, {
            controlFlow: [
                'src/score.test.ts:2: if inside a test body (test starts line 1)',
                'test/score.spec.jsx:2: if inside a test body (test starts line 1)',
            ],
        }), [], NO_PATH);

        check('skips installed, built and hidden folders', {
            'node_modules/lib/score.test.js': branching,
            'dist/score.test.js': branching,
            '.cache/score.test.js': branching,
            'src/score.test.ts': code`
                it('scores an answer', () => {
                    expect(score).toBe(1);
                });
            `,
        }, passes(1), [], NO_PATH);

        check('reads only the roots in .claude/writing-tests/config.json', {
            '.claude/writing-tests/config.json': '{ "roots": ["tests"] }\n',
            'tests/score.test.ts': branching,
            'scripts/score.test.ts': branching,
        }, fails(1, { controlFlow: ['tests/score.test.ts:2: if inside a test body (test starts line 1)'] }), [], NO_PATH);
    });
});
