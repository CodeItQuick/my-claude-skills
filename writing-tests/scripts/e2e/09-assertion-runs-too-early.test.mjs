import { describe } from 'node:test';
import { check, fails, passes, spec } from './validator-cli.mjs';

const UNAWAITED = 'async assertion with no await, so the test can end before it runs';
const oneTimeRead = method => `expect(await …${method}()) reads the page once; use a web-first matcher, which retries`;

describe('9. An assertion that runs too early', () => {
    describe('an async assertion with no await', () => {
        check('fails on resolves with no await, which settles after the test ends', spec`
            it('loads the quiz', () => {
                expect(load('agile')).resolves.toEqual(agileQuiz);
            });
        `, fails(1, { unawaited: [`spec.test.ts:2: ${UNAWAITED}`] }));

        check('fails on rejects with no await', spec`
            it('rejects a missing quiz', () => {
                expect(load('missing')).rejects.toThrow('not found');
            });
        `, fails(1, { unawaited: [`spec.test.ts:2: ${UNAWAITED}`] }));

        check('fails on expect.poll with no await', spec`
            it('saves the session', () => {
                save(session);
                expect.poll(() => store.size).toBe(1);
            });
        `, fails(1, { unawaited: [`spec.test.ts:3: ${UNAWAITED}`] }));

        check('fails on a Playwright web-first matcher with no await', spec`
            import { test, expect } from '@playwright/test';

            test('shows the score', async ({ page }) => {
                await page.goto('/score');
                expect(page.getByText('Score')).toBeVisible();
            });
        `, fails(1, { unawaited: [`spec.test.ts:5: ${UNAWAITED}`] }));

        check('fails on a negated web-first matcher with no await', spec`
            import { test, expect } from '@playwright/test';

            test('hides the spinner', async ({ page }) => {
                await page.goto('/score');
                expect(page.getByRole('progressbar')).not.toBeVisible();
            });
        `, fails(1, { unawaited: [`spec.test.ts:5: ${UNAWAITED}`] }));

        check('fails on expect.soft with a web-first matcher and no await', spec`
            import { test, expect } from '@playwright/test';

            test('shows the heading', async ({ page }) => {
                await page.goto('/score');
                expect.soft(page.getByRole('heading')).toHaveText('Score');
            });
        `, fails(1, { unawaited: [`spec.test.ts:5: ${UNAWAITED}`] }));

        check('passes with await', spec`
            it('loads the quiz', async () => {
                await expect(load('agile')).resolves.toEqual(agileQuiz);
            });
        `, passes(1));

        check('passes when the test returns the assertion', spec`
            it('loads the quiz', () => {
                return expect(load('agile')).resolves.toEqual(agileQuiz);
            });
        `, passes(1));

        check('passes when an arrow returns the assertion', spec`
            it('loads the quiz', () => expect(load('agile')).resolves.toEqual(agileQuiz));
        `, passes(1));

        check('passes on toBeVisible outside a Playwright file, where it is a sync matcher', spec`
            it('shows the score', () => {
                expect(wrapper.find('.score').element).toBeVisible();
            });
        `, passes(1));
    });

    describe('a one-time read inside an e2e assertion', () => {
        check('fails on isVisible, which checks the page once and never waits', spec`
            import { test, expect } from '@playwright/test';

            test('shows the score', async ({ page }) => {
                await page.goto('/score');
                expect(await page.getByText('Score').isVisible()).toBe(true);
            });
        `, fails(1, { unretried: [`spec.test.ts:5: ${oneTimeRead('isVisible')}`] }));

        check('fails on textContent', spec`
            import { test, expect } from '@playwright/test';

            test('names the page', async ({ page }) => {
                await page.goto('/score');
                expect(await page.getByRole('heading').textContent()).toBe('Score');
            });
        `, fails(1, { unretried: [`spec.test.ts:5: ${oneTimeRead('textContent')}`] }));

        check('fails on count', spec`
            import { test, expect } from '@playwright/test';

            test('lists three answers', async ({ page }) => {
                await page.goto('/review');
                expect(await page.getByRole('listitem').count()).toBe(3);
            });
        `, fails(1, { unretried: [`spec.test.ts:5: ${oneTimeRead('count')}`] }));

        check('passes with a web-first matcher, which retries until it holds', spec`
            import { test, expect } from '@playwright/test';

            test('shows the score', async ({ page }) => {
                await page.goto('/score');
                await expect(page.getByText('Score')).toBeVisible();
            });
        `, passes(1));

        check('passes with toHaveCount in place of count', spec`
            import { test, expect } from '@playwright/test';

            test('lists three answers', async ({ page }) => {
                await page.goto('/review');
                await expect(page.getByRole('listitem')).toHaveCount(3);
            });
        `, passes(1));

        check('passes on an awaited read in a unit test, where nothing renders late', spec`
            it('counts the stored sessions', async () => {
                expect(await store.count()).toBe(3);
            });
        `, passes(1));

        check('fails on evaluate, which the method list did not name', spec`
            import { test, expect } from '@playwright/test';

            test('shows three steps', async ({ page }) => {
                await page.goto('/results');
                expect(await page.evaluate(() => document.querySelectorAll('.step').length)).toBe(3);
            });
        `, fails(1, { unretried: [`spec.test.ts:5: ${oneTimeRead('evaluate')}`] }));

        check('fails on allTextContents', spec`
            import { test, expect } from '@playwright/test';

            test('lists the answers', async ({ page }) => {
                await page.goto('/review');
                expect(await page.getByRole('listitem').allTextContents()).toEqual(['A', 'B']);
            });
        `, fails(1, { unretried: [`spec.test.ts:5: ${oneTimeRead('allTextContents')}`] }));

        check('fails on boundingBox', spec`
            import { test, expect } from '@playwright/test';

            test('sizes the card', async ({ page }) => {
                await page.goto('/review');
                expect(await page.getByTestId('card').boundingBox()).toMatchObject({ width: 320 });
            });
        `, fails(1, { unretried: [`spec.test.ts:5: ${oneTimeRead('boundingBox')}`] }));
    });

    describe('a one-time read held in a variable', () => {
        const held = (name, method, line) => `spec.test.ts:${line}: ${name} holds a one-time ${method}() read, and expect(${name}) checks it once; use expect.poll or a web-first matcher, which retries`;

        check('warns on evaluate held in a variable and asserted later', spec`
            import { test, expect } from '@playwright/test';

            test('shows three steps', async ({ page }) => {
                await page.goto('/results');
                const steps = await page.evaluate(() => document.querySelectorAll('.step').length);
                expect(steps).toBe(3);
            });
        `, passes(1, { held: [held('steps', 'evaluate', 5)] }));

        check('warns on textContent held in a variable, when a property of it is asserted', spec`
            import { test, expect } from '@playwright/test';

            test('names the page', async ({ page }) => {
                await page.goto('/score');
                const heading = await page.getByRole('heading').textContent();
                expect(heading.trim()).toBe('Score');
            });
        `, passes(1, { held: [held('heading', 'textContent', 5)] }));

        check('passes when the variable is never asserted', spec`
            import { test, expect } from '@playwright/test';

            test('answers the question', async ({ page }) => {
                await page.goto('/quiz');
                const heading = await page.getByRole('heading').textContent();
                await page.getByRole('button', { name: heading }).click();
                await expect(page.getByText('Score')).toBeVisible();
            });
        `, passes(1));

        check('passes when the read comes after an awaited web-first matcher', spec`
            import { test, expect } from '@playwright/test';

            test('shows three steps', async ({ page }) => {
                await page.goto('/results');
                await expect(page.locator('.step').first()).toBeVisible();
                const steps = await page.evaluate(() => document.querySelectorAll('.step').length);
                expect(steps).toBe(3);
            });
        `, passes(1));

        check('passes when the read is inside expect(async …).toPass(), which retries it', spec`
            import { test, expect } from '@playwright/test';

            test('changes the question', async ({ page }) => {
                await page.goto('/quiz');
                await expect(async () => {
                    const heading = await page.getByRole('heading').textContent();
                    expect(heading).not.toBe('First');
                }).toPass();
            });
        `, passes(1));

        check('passes outside a Playwright file, where nothing renders late', spec`
            it('counts the stored sessions', async () => {
                const total = await store.count();
                expect(total).toBe(3);
            });
        `, passes(1));
    });

    describe('console output inside a test', () => {
        const logged = line => `spec.test.ts:${line}: console output inside a test body; assert the value or delete the line`;

        check('warns on console.log, which computes a probe and checks nothing', spec`
            it('gates the motion', () => {
                const reduced = readMotion();
                console.log('MOTION ' + reduced);
                expect(stored()).toBe(true);
            });
        `, passes(1, { logged: [logged(3)] }));

        check('warns on console.debug and console.info', spec`
            it('gates the motion', () => {
                console.debug(readMotion());
                console.info(readMotion());
                expect(stored()).toBe(true);
            });
        `, passes(1, { logged: [logged(2), logged(3)] }));

        check('passes on console.log in a helper outside any test', spec`
            const trace = text => console.log(text);

            it('gates the motion', () => {
                expect(stored()).toBe(true);
            });
        `, passes(1));
    });

    describe('Playwright matchers that retry until a callback or a response holds', () => {
        check('fails on toPass with no await, which never waits for the callback', spec`
            import { test, expect } from '@playwright/test';

            test('changes the question', async ({ page }) => {
                await page.goto('/quiz');
                expect(async () => {
                    expect(await page.getByRole('heading').textContent()).not.toBe('First');
                }).toPass();
            });
        `, fails(1, { unawaited: [`spec.test.ts:5: ${UNAWAITED}`], unretried: [`spec.test.ts:6: ${oneTimeRead('textContent')}`] }));

        check('fails on toBeOK with no await', spec`
            import { test, expect } from '@playwright/test';

            test('serves the health check', async ({ request }) => {
                const response = await request.get('/health');
                expect(response).toBeOK();
            });
        `, fails(1, { unawaited: [`spec.test.ts:5: ${UNAWAITED}`] }));

        check('passes on toPass and toBeOK with await', spec`
            import { test, expect } from '@playwright/test';

            test('serves the health check', async ({ page, request }) => {
                await expect(await request.get('/health')).toBeOK();
                await expect(async () => {
                    await expect(page.getByRole('heading')).toHaveText('Quiz');
                }).toPass();
            });
        `, passes(1));
    });
});
