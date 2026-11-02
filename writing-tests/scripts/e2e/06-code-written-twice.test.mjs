import { describe } from 'node:test';
import { check, code, fails, passes, spec } from './validator-cli.mjs';

describe('6. Code written twice', () => {
    describe('a helper copied into two spec files', () => {
        check('fails on the same helper in two files', {
            'a.test.ts': code`
                function startQuiz(page) {
                    return page.click('#start');
                }

                it('starts the first quiz', () => {
                    expect(startQuiz(firstPage)).toBe(true);
                });
            `,
            'b.test.ts': code`
                function startQuiz(page) {
                    return page.click('#start');
                }

                it('starts the second quiz', () => {
                    expect(startQuiz(secondPage)).toBe(true);
                });
            `,
        }, fails(2, { copied: ['startQuiz: same body in 2 spec files — a.test.ts, b.test.ts'] }));

        check('fails on a renamed copy, because the validator compares bodies', {
            'a.test.ts': code`
                function startQuiz(page) {
                    return page.click('#start');
                }

                it('starts the first quiz', () => {
                    expect(startQuiz(firstPage)).toBe(true);
                });
            `,
            'b.test.ts': code`
                function beginQuiz(page) {
                    return page.click('#start');
                }

                it('starts the second quiz', () => {
                    expect(beginQuiz(secondPage)).toBe(true);
                });
            `,
        }, fails(2, { copied: ['startQuiz / beginQuiz: same body in 2 spec files — a.test.ts, b.test.ts'] }));

        check('fails on a helper copied with different spacing', {
            'a.test.ts': code`
                function startQuiz(page) {
                    return page.click('#start');
                }

                it('starts the first quiz', () => {
                    expect(startQuiz(firstPage)).toBe(true);
                });
            `,
            'b.test.ts': code`
                function startQuiz( page ) {
                    return page.click( '#start' );
                }

                it('starts the second quiz', () => {
                    expect(startQuiz(secondPage)).toBe(true);
                });
            `,
        }, fails(2, { copied: ['startQuiz: same body in 2 spec files — a.test.ts, b.test.ts'] }));

        check('fails on a string constant copied into two files', {
            'a.test.ts': code`
                const HOST = 'http://localhost:3000';

                it('opens the first page', () => {
                    expect(urlOf('first')).toBe(HOST + '/first');
                });
            `,
            'b.test.ts': code`
                const HOST = 'http://localhost:3000';

                it('opens the second page', () => {
                    expect(urlOf('second')).toBe(HOST + '/second');
                });
            `,
        }, fails(2, { copied: ['HOST: same body in 2 spec files — a.test.ts, b.test.ts'] }));

        check('passes when both files import one copy from support/', {
            'support/quiz.ts': code`
                export function startQuiz(page) {
                    return page.click('#start');
                }
            `,
            'a.test.ts': code`
                import { startQuiz } from './support/quiz';

                it('starts the first quiz', () => {
                    expect(startQuiz(firstPage)).toBe(true);
                });
            `,
            'b.test.ts': code`
                import { startQuiz } from './support/quiz';

                it('starts the second quiz', () => {
                    expect(startQuiz(secondPage)).toBe(true);
                });
            `,
        }, passes(2));

        check('passes when two constants differ in their string', {
            'a.test.ts': code`
                const HOST = 'http://localhost:3000';

                it('opens the first page', () => {
                    expect(urlOf('first')).toBe(HOST + '/first');
                });
            `,
            'b.test.ts': code`
                const HOST = 'http://localhost:4000';

                it('opens the second page', () => {
                    expect(urlOf('second')).toBe(HOST + '/second');
                });
            `,
        }, passes(2));

        check('passes on a constant computed from imports, which names a different bank in each file', {
            'a.test.ts': code`
                import { juniorQuestions } from '../src/agile_questions/junior';
                const bank = [...juniorQuestions];

                it('holds 100 junior questions', () => {
                    expect(bank).toHaveLength(100);
                });
            `,
            'b.test.ts': code`
                import { juniorQuestions } from '../src/devops_questions/junior';
                const bank = [...juniorQuestions];

                it('holds 100 junior questions', () => {
                    expect(bank).toHaveLength(100);
                });
            `,
        }, passes(2));
    });

    describe('one helper name with two bodies', () => {
        check('warns, and passes, because the two can be a copy that drifted', {
            'a.test.ts': code`
                async function sit(count) {
                    return count;
                }

                it('sits once', async () => {
                    expect(await sit(1)).toBe(1);
                });
            `,
            'b.test.ts': code`
                async function sit(playerId, count) {
                    return [playerId, count];
                }

                it('sits for one player', async () => {
                    expect(await sit('p1', 1)).toEqual(['p1', 1]);
                });
            `,
        }, passes(2, { sameName: ['sit: different bodies in 2 spec files — a.test.ts, b.test.ts'] }));

        check('warns on two arrow helpers that share a name', {
            'a.test.ts': code`
                const answerFor = () => 3;

                it('answers agree', () => {
                    expect(answerFor()).toBe(3);
                });
            `,
            'b.test.ts': code`
                const answerFor = () => 1;

                it('answers disagree', () => {
                    expect(answerFor()).toBe(1);
                });
            `,
        }, passes(2, { sameName: ['answerFor: different bodies in 2 spec files — a.test.ts, b.test.ts'] }));
    });

    describe('one test body written twice', () => {
        check('fails on two tests in one file with the same body', spec`
            it('scores a correct answer', () => {
                expect(scoreOf(correctAnswer)).toBe(1);
            });

            it('gives a point for a right answer', () => {
                expect(scoreOf(correctAnswer)).toBe(1);
            });
        `, fails(1, { twice: ['same test body at spec.test.ts:1, spec.test.ts:5'] }));

        check('fails when the two bodies differ only in a comment', spec`
            it('scores a correct answer', () => {
                expect(scoreOf(correctAnswer)).toBe(1);
            });

            it('gives a point for a right answer', () => {
                // The same check, reworded.
                expect(scoreOf(correctAnswer)).toBe(1);
            });
        `, fails(1, { twice: ['same test body at spec.test.ts:1, spec.test.ts:5'] }));

        check('fails when the two bodies differ only in spacing inside parentheses', spec`
            it('scores a correct answer', () => {
                expect(scoreOf(correctAnswer)).toBe(1);
            });

            it('gives a point for a right answer', () => {
                expect( scoreOf( correctAnswer ) ).toBe( 1 );
            });
        `, fails(1, { twice: ['same test body at spec.test.ts:1, spec.test.ts:5'] }));

        check('passes when two bodies differ in a word, though spacing is ignored', spec`
            it('scores a new date', () => {
                expect(scoreOf(new Date(0))).toBe(1);
            });

            it('scores a call to newDate', () => {
                expect(scoreOf(newDate(0))).toBe(1);
            });
        `, passes(1));

        check('passes when two bodies differ only inside a string', spec`
            it('names the first factor', () => {
                expect(nameOf(first)).toBe('a, b');
            });

            it('names the second factor', () => {
                expect(nameOf(first)).toBe('a,b');
            });
        `, passes(1));

        check('passes when each test checks a different behavior', spec`
            it('scores a correct answer', () => {
                expect(scoreOf(correctAnswer)).toBe(1);
            });

            it('scores a wrong answer as zero', () => {
                expect(scoreOf(wrongAnswer)).toBe(0);
            });
        `, passes(1));

        check('passes when the same body is in two files, which can import different code', {
            'a.test.ts': code`
                it('holds 400 questions', () => {
                    expect(bank).toHaveLength(400);
                });
            `,
            'b.test.ts': code`
                it('holds 400 questions', () => {
                    expect(bank).toHaveLength(400);
                });
            `,
        }, passes(2));
    });
});
