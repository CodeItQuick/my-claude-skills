import { describe } from 'node:test';
import { check, code, fails, passes, spec } from './validator-cli.mjs';

describe('1. An assertion that does not run on every pass', () => {
    describe('a branch around an assertion', () => {
        check('fails on an if, which skips the assertion on the other path', spec`
            it('scores a correct answer', () => {
                if (answer.correct) expect(score).toBe(1);
            });
        `, fails(1, { controlFlow: ['spec.test.ts:2: if inside a test body (test starts line 1)'] }));

        check('fails on an if and its else, once for each', spec`
            it('scores an answer', () => {
                if (answer.correct) expect(score).toBe(1);
                else expect(score).toBe(0);
            });
        `, fails(1, { controlFlow: [
            'spec.test.ts:2: if inside a test body (test starts line 1)',
            'spec.test.ts:3: else inside a test body (test starts line 1)',
        ] }));

        check('fails on a switch, which runs one case of several', spec`
            it('scores an answer', () => {
                switch (answer.kind) {
                    case 'correct': expect(score).toBe(1);
                }
            });
        `, fails(1, { controlFlow: ['spec.test.ts:2: switch inside a test body (test starts line 1)'] }));

        check('fails on a ternary, which computes the answer the test wants', spec`
            it('scores an answer', () => {
                expect(score).toBe(answer.correct ? 1 : 0);
            });
        `, fails(1, { controlFlow: ['spec.test.ts:2: ternary inside a test body (test starts line 1)'] }));

        check('fails on an || fallback, which hides which side held', spec`
            it('scores an answer', () => {
                expect(answer.score || 0).toBe(1);
            });
        `, fails(1, { controlFlow: ['spec.test.ts:2: || fallback inside a test body (test starts line 1)'] }));

        check('fails on a ?? fallback, which hides which side held', spec`
            it('scores an answer', () => {
                expect(answer.score ?? 0).toBe(1);
            });
        `, fails(1, { controlFlow: ['spec.test.ts:2: ?? fallback inside a test body (test starts line 1)'] }));

        check('passes on ?. and ??=, which do not choose a side of an assertion', spec`
            it('scores an answer', () => {
                cache.score ??= 1;
                expect(answer?.score).toBe(1);
            });
        `, passes(1));

        check('passes when the test asserts the condition, then the result', spec`
            it('scores a correct answer', () => {
                expect(answer.correct).toBe(true);
                expect(score).toBe(1);
            });
        `, passes(1));

        check('passes when each branch is its own test', spec`
            it('scores a correct answer', () => {
                expect(scoreOf(correctAnswer)).toBe(1);
            });

            it('scores a wrong answer as zero', () => {
                expect(scoreOf(wrongAnswer)).toBe(0);
            });
        `, passes(1));
    });

    describe('a try/catch to assert a throw', () => {
        check('fails on a try/catch, which passes when nothing throws', spec`
            it('rejects bad input', () => {
                try {
                    parse('{');
                } catch (error) {
                    expect(error.message).toBe('unparseable');
                }
            });
        `, fails(1, { controlFlow: ['spec.test.ts:2: try/catch inside a test body (test starts line 1)'] }));

        check('passes with toThrow, which fails when nothing throws', spec`
            it('rejects bad input', () => {
                expect(() => parse('{')).toThrow('unparseable');
            });
        `, passes(1));

        check('passes with rejects.toThrow for an async throw', spec`
            it('rejects a missing quiz', async () => {
                await expect(load('missing')).rejects.toThrow('not found');
            });
        `, passes(1));
    });

    describe('a loop that asserts', () => {
        check('fails on a for, one test that hides which case broke', spec`
            it('scores every correct answer', () => {
                for (const answer of correctAnswers) expect(scoreOf(answer)).toBe(1);
            });
        `, fails(1, { controlFlow: ['spec.test.ts:2: for inside a test body (test starts line 1)'] }));

        check('fails on a while', spec`
            it('drains the queue', () => {
                while (queue.length) expect(queue.shift()).toBe(1);
            });
        `, fails(1, { controlFlow: ['spec.test.ts:2: while inside a test body (test starts line 1)'] }));

        check('fails on a forEach', spec`
            it('scores every correct answer', () => {
                correctAnswers.forEach(answer => expect(scoreOf(answer)).toBe(1));
            });
        `, fails(1, { controlFlow: ['spec.test.ts:2: forEach inside a test body (test starts line 1)'] }));

        check('passes when the loop is around the tests, one named test per case', spec`
            describe('scoring', () => {
                for (const answer of correctAnswers) {
                    it('scores ' + answer.id, () => {
                        expect(scoreOf(answer)).toBe(1);
                    });
                }
            });
        `, passes(1));

        check('passes when one assertion checks the whole shape', spec`
            it('scores every correct answer', () => {
                expect(correctAnswers.map(scoreOf)).toEqual([1, 1, 1]);
            });
        `, passes(1));
    });

    describe('control flow in a test-file helper', () => {
        check('warns on a driving loop in a function helper, and still passes', spec`
            function answerAll(page, count) {
                for (let answered = 0; answered < count; answered++) page.click('#answer');
            }

            it('finishes the quiz', () => {
                answerAll(page, 10);
                expect(page.url()).toBe('/done');
            });
        `, passes(1, { helper: ['spec.test.ts:2: for in a test-file helper (helper starts line 1)'] }));

        check('warns on a ?? fallback in a helper', spec`
            const scoreOf = answer => answer.score ?? 0;

            it('scores an answer', () => {
                expect(scoreOf(answer)).toBe(1);
            });
        `, passes(1, { helper: ['spec.test.ts:1: ?? fallback in a test-file helper (helper starts line 1)'] }));

        check('warns on a ternary in an arrow helper', spec`
            const answerFor = question => question.likert ? 3 : 0;

            it('answers a survey', () => {
                expect(answerFor(surveyQuestion)).toBe(3);
            });
        `, passes(1, { helper: ['spec.test.ts:1: ternary in a test-file helper (helper starts line 1)'] }));

        check('warns on a typed arrow helper', spec`
            const answerFor: Strategy = question => question.likert ? 3 : 0;

            it('answers a survey', () => {
                expect(answerFor(surveyQuestion)).toBe(3);
            });
        `, passes(1, { helper: ['spec.test.ts:1: ternary in a test-file helper (helper starts line 1)'] }));

        check('warns on a helper whose parameter has an object type', spec`
            function firstFactor(ordered: ReadonlyArray<{ factor: string }>) {
                if (ordered.length === 0) return 'none';
                return ordered[0].factor;
            }

            it('names the first factor', () => {
                expect(firstFactor(factors)).toBe('patience');
            });
        `, passes(1, { helper: ['spec.test.ts:2: if in a test-file helper (helper starts line 1)'] }));

        check('passes when the helper lives in support/, which is not a spec file', {
            'support/answers.ts': code`
                export function answerAll(page, count) {
                    for (let answered = 0; answered < count; answered++) page.click('#answer');
                }
            `,
            'spec.test.ts': code`
                import { answerAll } from './support/answers';

                it('finishes the quiz', () => {
                    answerAll(page, 10);
                    expect(page.url()).toBe('/done');
                });
            `,
        }, passes(1));
    });

    describe('control flow in a before or after hook', () => {
        check('warns on an if in a beforeEach, which decides what every test runs against', spec`
            beforeEach(() => {
                if (process.env.CI) store.seed(fixtures);
            });

            it('lists the seeded results', () => {
                expect(store.size).toBe(3);
            });
        `, passes(1, { hookFlow: ['spec.test.ts:2: if in a test-file hook (hook starts line 1)'] }));

        check('warns on a driving loop in a beforeAll', spec`
            beforeAll(async () => {
                for (const record of fixtures) await store.save(record);
            });

            it('lists the seeded results', () => {
                expect(store.size).toBe(3);
            });
        `, passes(1, { hookFlow: ['spec.test.ts:2: for in a test-file hook (hook starts line 1)'] }));

        check('passes on an if that only deletes, which puts back a variable that was unset', spec`
            afterEach(() => {
                process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
                if (ORIGINAL_DATABASE_URL === undefined) delete process.env.DATABASE_URL;
            });

            it('connects without a database', () => {
                expect(connect(UNREACHABLE).ready).toBe(false);
            });
        `, passes(1));

        check('warns on an if in a Mocha before', spec`
            before(() => {
                if (process.env.CI) store.seed(fixtures);
            });

            it('lists the seeded results', () => {
                expect(store.size).to.equal(3);
            });
        `, passes(1, { hookFlow: ['spec.test.ts:2: if in a test-file hook (hook starts line 1)'] }));

        check('passes on an if that only deletes, in a Mocha after', spec`
            after(() => {
                if (ORIGINAL_DATABASE_URL === undefined) delete process.env.DATABASE_URL;
            });

            it('connects without a database', () => {
                expect(connect(UNREACHABLE).status).to.equal('offline');
            });
        `, passes(1));

        check('passes on the same restore with braces', spec`
            afterEach(() => {
                if (ORIGINAL_DATABASE_URL === undefined) {
                    delete process.env.DATABASE_URL;
                }
            });

            it('connects without a database', () => {
                expect(connect(UNREACHABLE).ready).toBe(false);
            });
        `, passes(1));
    });

    describe('a focused test that skips the rest', () => {
        check('fails on it.only, which runs one test and reports the run green', spec`
            it.only('scores a correct answer', () => {
                expect(scoreOf(correctAnswer)).toBe(1);
            });

            it('scores a wrong answer as zero', () => {
                expect(scoreOf(wrongAnswer)).toBe(0);
            });
        `, fails(1, { focused: ['spec.test.ts:1: .only runs this and skips every other test in the file'] }));

        check('fails on test.only', spec`
            test.only('shows the score', async ({ page }) => {
                await expect(page.getByText('Score')).toBeVisible();
            });
        `, fails(1, { focused: ['spec.test.ts:1: .only runs this and skips every other test in the file'] }));

        check('fails on describe.only', spec`
            describe.only('scoring', () => {
                it('scores a correct answer', () => {
                    expect(scoreOf(correctAnswer)).toBe(1);
                });
            });
        `, fails(1, { focused: ['spec.test.ts:1: .only runs this and skips every other test in the file'] }));

        check('fails on test.describe.only', spec`
            test.describe.only('scoring', () => {
                test('shows the score', async ({ page }) => {
                    await expect(page.getByText('Score')).toBeVisible();
                });
            });
        `, fails(1, { focused: ['spec.test.ts:1: .only runs this and skips every other test in the file'] }));

        check('passes when no test is focused', spec`
            it('scores a correct answer', () => {
                expect(scoreOf(correctAnswer)).toBe(1);
            });
        `, passes(1));

        check('passes on .only in a comment', spec`
            // Use it.only while you debug, and remove it before the commit.
            it('scores a correct answer', () => {
                expect(scoreOf(correctAnswer)).toBe(1);
            });
        `, passes(1));

        check('passes on it.skip, which skips one test and leaves the rest running', spec`
            it.skip('scores a skipped answer', () => {
                expect(scoreOf(skippedAnswer)).toBe(0);
            });
        `, passes(1));
    });
});
