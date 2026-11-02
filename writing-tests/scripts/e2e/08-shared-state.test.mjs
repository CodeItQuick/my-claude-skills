import { describe } from 'node:test';
import { check, passes, spec } from './validator-cli.mjs';

describe('8. State shared between tests', () => {
    describe('a variable that one test assigns and the next test reads', () => {
        const shared = name => `${name} is shared between tests: a test assigns it and no beforeEach resets it`;

        check('warns on a module-level let that tests assign, so the result depends on order', spec`
            let total = 0;

            it('adds a correct answer', () => {
                total = add(total, 1);
                expect(total).toBe(1);
            });

            it('adds a second answer', () => {
                total = add(total, 1);
                expect(total).toBe(2);
            });
        `, passes(1, { shared: [`spec.test.ts:1: ${shared('total')}`] }));

        check('warns on a counter that a test increments', spec`
            let calls = 0;

            it('calls the scorer once', () => {
                calls++;
                expect(calls).toBe(1);
            });
        `, passes(1, { shared: [`spec.test.ts:1: ${shared('calls')}`] }));

        check('warns on a let in a describe body', spec`
            describe('scoring', () => {
                let total;

                it('adds a correct answer', () => {
                    total = add(0, 1);
                    expect(total).toBe(1);
                });
            });
        `, passes(1, { shared: [`spec.test.ts:2: ${shared('total')}`] }));

        check('passes when a beforeEach resets the variable before every test', spec`
            let total;
            beforeEach(() => {
                total = 0;
            });

            it('adds a correct answer', () => {
                total = add(total, 1);
                expect(total).toBe(1);
            });
        `, passes(1));

        check('passes when the test declares its own variable of the same name', spec`
            let total = 0;

            it('adds a correct answer', () => {
                const total = add(0, 1);
                expect(total).toBe(1);
            });
        `, passes(1));

        check('passes when the tests only read the variable', spec`
            let total = 0;

            it('adds a correct answer', () => {
                expect(add(total, 1)).toBe(1);
            });
        `, passes(1));
    });
});
