import { describe } from 'node:test';
import { check, fails, passes, spec } from './validator-cli.mjs';

/** One spec file whose single test body is `lines` lines of assertions. */
const testOfLines = lines => ({
    'spec.test.ts': "it('scores every answer', () => {\n"
        + Array.from({ length: lines }, (_, index) => `    expect(scoreOf(answers[${index}])).toBe(1);\n`).join('')
        + '});\n',
});

const INFO = ['--info'];

describe('10. A test that is hard to read or change', () => {
    describe('a long test body', () => {
        check('warns on a body one line over the limit of 20', testOfLines(21),
            passes(1, { longTest: ['spec.test.ts:1: test body is 21 lines, over 20'] }));

        check('warns on a body far over the limit', testOfLines(40),
            passes(1, { longTest: ['spec.test.ts:1: test body is 40 lines, over 20'] }));

        check('passes on a body of exactly 20 lines', testOfLines(20), passes(1));
    });

    describe('a mock of your own module (info, with --info only)', () => {
        const OWN = path => `mock of your own module ${path}; a mock of domain code couples the test to it`;

        check('reports a relative path, which is the project\'s own code', spec`
            vi.mock('../src/scoring');

            it('shows the score', () => {
                expect(render(scoreView)).toContain('3');
            });
        `, passes(1, { mockedOwn: [`spec.test.ts:1: ${OWN('../src/scoring')}`] }), INFO);

        check('reports an @/ alias path', spec`
            vi.mock('@/features/scoring');

            it('shows the score', () => {
                expect(render(scoreView)).toContain('3');
            });
        `, passes(1, { mockedOwn: [`spec.test.ts:1: ${OWN('@/features/scoring')}`] }), INFO);

        check('reports nothing without --info, so the repo-wide run stays quiet', spec`
            vi.mock('../src/scoring');

            it('shows the score', () => {
                expect(render(scoreView)).toContain('3');
            });
        `, passes(1));

        check('reports nothing for a package, which is a dependency to isolate', spec`
            vi.mock('axios');

            it('shows the score', () => {
                expect(render(scoreView)).toContain('3');
            });
        `, passes(1), INFO);
    });

    describe('a variable reassigned inside a test (info, with --info only)', () => {
        check('reports a let that the test assigns again', spec`
            it('counts the answers', () => {
                let total = 0;
                total = add(total, 1);
                expect(total).toBe(1);
            });
        `, passes(1, { reassigned: ['spec.test.ts:2: total is reassigned inside the test'] }), INFO);

        check('reports a let that the test increments', spec`
            it('counts the answers', () => {
                let total = 0;
                total++;
                expect(total).toBe(1);
            });
        `, passes(1, { reassigned: ['spec.test.ts:2: total is reassigned inside the test'] }), INFO);

        check('reports a let that a loop in the test adds to', spec`
            it('totals the answers', () => {
                let total = 0;
                for (const answer of answers) total += answer;
                expect(total).toBe(3);
            });
        `, fails(1, {
            reassigned: ['spec.test.ts:2: total is reassigned inside the test'],
            controlFlow: ['spec.test.ts:3: for inside a test body (test starts line 1)'],
        }), INFO);

        check('reports nothing for a for-loop counter, which is loop state, and the for already fails', spec`
            it('draws three questions', () => {
                for (let draw = 0; draw < 3; draw++) questioner.next();
                expect(questioner.asked).toBe(3);
            });
        `, fails(1, { controlFlow: ['spec.test.ts:2: for inside a test body (test starts line 1)'] }), INFO);

        check('reports nothing for a const, which holds one value', spec`
            it('counts the answers', () => {
                const total = add(0, 1);
                expect(total).toBe(1);
            });
        `, passes(1), INFO);

        check('reports nothing without --info', spec`
            it('counts the answers', () => {
                let total = 0;
                total = add(total, 1);
                expect(total).toBe(1);
            });
        `, passes(1));
    });
});
