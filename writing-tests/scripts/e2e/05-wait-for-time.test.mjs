import { describe } from 'node:test';
import { check, fails, passes, spec } from './validator-cli.mjs';

describe('5. A wait for a time, not for a condition', () => {
    describe('a fixed sleep', () => {
        check('fails on waitForTimeout, which guesses how long a load takes', spec`
            test('loads the next question', async ({ page }) => {
                await page.getByRole('button', { name: 'Answer' }).click();
                await page.waitForTimeout(600);
                await expect(page.getByRole('heading')).toHaveText('Question 2');
            });
        `, fails(1, { sleep: ['spec.test.ts:3: waitForTimeout() inside a test body'] }));

        check('fails on a promise around setTimeout', spec`
            it('saves after a pause', async () => {
                save(session);
                await new Promise(resolve => setTimeout(resolve, 1_500));
                expect(store.size).toBe(1);
            });
        `, fails(1, { sleep: ['spec.test.ts:3: setTimeout() inside a test body'] }));

        check('fails on waitForTimeout even when the file fakes the timers', spec`
            beforeEach(() => vi.useFakeTimers());
            afterEach(() => vi.useRealTimers());

            test('loads the next question', async ({ page }) => {
                await page.waitForTimeout(600);
                await expect(page.getByRole('heading')).toHaveText('Question 2');
            });
        `, fails(1, { sleep: ['spec.test.ts:5: waitForTimeout() inside a test body'] }));

        check('passes when a web-first assertion waits for the condition', spec`
            test('loads the next question', async ({ page }) => {
                await page.getByRole('button', { name: 'Answer' }).click();
                await expect(page.getByRole('heading')).toHaveText('Question 2');
            });
        `, passes(1));

        check('passes when expect.poll retries until the condition holds', spec`
            it('saves the session', async () => {
                save(session);
                await expect.poll(() => store.size).toBe(1);
            });
        `, passes(1));

        check('warns on waitForTimeout in a helper, which hides the guess one function out', spec`
            async function openReview(page) {
                await page.getByRole('button', { name: 'Review' }).click();
                await page.waitForTimeout(400);
            }

            test('opens the review', async ({ page }) => {
                await openReview(page);
                await expect(page.getByRole('dialog')).toBeVisible();
            });
        `, passes(1, { helperSleep: ['spec.test.ts:3: waitForTimeout() in a test-file helper (helper starts line 1)'] }));

        check('passes when the helper waits for the condition', spec`
            async function openReview(page) {
                await page.getByRole('button', { name: 'Review' }).click();
                await expect(page.getByRole('dialog')).toBeVisible();
            }

            test('opens the review', async ({ page }) => {
                await openReview(page);
                await expect(page.getByRole('dialog')).toHaveAccessibleName('Your answers');
            });
        `, passes(1));

        check('passes on setTimeout under fake timers, which advance by hand', spec`
            beforeEach(() => vi.useFakeTimers());
            afterEach(() => vi.useRealTimers());

            it('saves after a pause', () => {
                setTimeout(() => save(session), 1_500);
                vi.advanceTimersByTime(1_500);
                expect(store.size).toBe(1);
            });
        `, passes(1));
    });
});
