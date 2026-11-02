import { describe } from 'node:test';
import { check, fails, passes, spec } from './validator-cli.mjs';

describe('2. An assertion that checks too little', () => {
    describe('a test with no assertion', () => {
        check('fails when the test only acts', spec`
            it('stores a session', () => {
                store.create('abc', 'developer');
            });
        `, fails(1, { unasserted: ['spec.test.ts:1: test has no assertion'] }));

        check('fails when the only assertion is in a comment', spec`
            it('stores a session', () => {
                store.create('abc', 'developer');
                // expect(store.get('abc')).toBe(created);
            });
        `, fails(1, { unasserted: ['spec.test.ts:1: test has no assertion'] }));

        check('fails when a Playwright test only clicks', spec`
            test('answers a question', async ({ page }) => {
                await page.getByRole('button', { name: 'Answer' }).click();
            });
        `, fails(1, { unasserted: ['spec.test.ts:1: test has no assertion'] }));

        check('passes with expect', spec`
            it('stores a session', () => {
                const created = store.create('abc', 'developer');
                expect(store.get('abc')).toBe(created);
            });
        `, passes(1));

        check('passes with expect.poll', spec`
            test('loads the score', async ({ page }) => {
                await expect.poll(() => page.title()).toBe('Score');
            });
        `, passes(1));

        check('passes with node assert', spec`
            it('stores a session', () => {
                assert.equal(store.size, 1);
            });
        `, passes(1));

        check('passes with chai should', spec`
            it('stores a session', () => {
                store.size.should.equal(1);
            });
        `, passes(1));

        check('passes with a helper named for an assertion', spec`
            test('shows the score', async ({ page }) => {
                await expectScore(page, 3);
            });
        `, passes(1));
    });

    describe('a comparison folded into a boolean assertion', () => {
        check('fails on === with toBe(true), which reports only false', spec`
            it('scores three', () => {
                expect(score === 3).toBe(true);
            });
        `, fails(1, { folded: ['spec.test.ts:2: comparison inside the assertion; compare with a matcher so a failure shows both values'] }));

        check('fails on !== with toBe(false)', spec`
            it('scores three', () => {
                expect(score !== 3).toBe(false);
            });
        `, fails(1, { folded: ['spec.test.ts:2: comparison inside the assertion; compare with a matcher so a failure shows both values'] }));

        check('fails on <= with not.toEqual(false)', spec`
            it('stays under the cap', () => {
                expect(score <= cap).not.toEqual(false);
            });
        `, fails(1, { folded: ['spec.test.ts:2: comparison inside the assertion; compare with a matcher so a failure shows both values'] }));

        check('fails on > with toBeTruthy, which is also a weak assertion', spec`
            it('beats the last score', () => {
                expect(score > lastScore).toBeTruthy();
            });
        `, fails(1, {
            weak: ['spec.test.ts:2: toBeTruthy()'],
            folded: ['spec.test.ts:2: comparison inside the assertion; compare with a matcher so a failure shows both values'],
        }));

        check('fails on assert(a === b)', spec`
            it('scores three', () => {
                assert(score === 3);
            });
        `, fails(1, { folded: ['spec.test.ts:2: comparison inside the assertion; compare with a matcher so a failure shows both values'] }));

        check('fails on assert.ok(a < b)', spec`
            it('stays under the cap', () => {
                assert.ok(score < cap);
            });
        `, fails(1, { folded: ['spec.test.ts:2: comparison inside the assertion; compare with a matcher so a failure shows both values'] }));

        check('passes when the matcher compares, so a failure shows the value', spec`
            it('scores three', () => {
                expect(score).toBe(3);
            });
        `, passes(1));

        check('passes with an ordering matcher', spec`
            it('beats the last score', () => {
                expect(score).toBeGreaterThan(lastScore);
            });
        `, passes(1));

        check('passes when the comparison is inside a call the subject makes', spec`
            it('counts the correct answers', () => {
                expect(countWhere(answers, answer => answer.score === 1)).toBe(2);
            });
        `, passes(1));

        check('passes when the comparison is only in an assert message', spec`
            it('stays under the cap', () => {
                assert.equal(total, 3, 'total < cap');
            });
        `, passes(1));

        check('fails on === with chai to.eq(true)', spec`
            it('scores three', () => {
                expect(score === 3).to.eq(true);
            });
        `, fails(1, { folded: ['spec.test.ts:2: comparison inside the assertion; compare with a matcher so a failure shows both values'] }));
    });

    describe('a boolean collapsed by every, some, has or a similar call', () => {
        const COLLAPSED = name => `spec.test.ts:2: expect(${name}(…)) collapses to a boolean; compare the value with a matcher so a failure shows it`;

        check('warns on every with toBe(true), which hides the element that broke it', spec`
            it('disables the buttons', () => {
                expect(buttons.every(button => button.disabled)).toBe(true);
            });
        `, passes(1, { weak: [COLLAPSED('x.every')] }));

        check('warns on some with toBe(false)', spec`
            it('never repeats an area', () => {
                expect(areas.some((area, index) => area === areas[index - 1])).toBe(false);
            });
        `, passes(1, { weak: [COLLAPSED('x.some')] }));

        check('warns on has, includes, startsWith and endsWith', spec`
            it('logs the sitting', () => {
                expect(ids.has('abc')).toBe(true);
                expect(text.includes('abc')).toBe(true);
                expect(text.startsWith('abc')).toBe(true);
                expect(text.endsWith('abc')).toBe(true);
            });
        `, passes(1, {
            weak: ['has', 'includes', 'startsWith', 'endsWith'].map((name, index) =>
                `spec.test.ts:${index + 2}: expect(x.${name}(…)) collapses to a boolean; compare the value with a matcher so a failure shows it`),
        }));

        check('warns on Array.isArray', spec`
            it('returns the answers', () => {
                expect(Array.isArray(body.answers)).toBe(true);
            });
        `, passes(1, { weak: [COLLAPSED('Array.isArray')] }));

        check('warns on a call that spans lines', spec`
            it('disables the buttons', () => {
                expect(
                    buttons.every(button => button.disabled),
                ).toBe(true);
            });
        `, passes(1, { weak: [COLLAPSED('x.every')] }));

        check('warns on a call after a chain', spec`
            it('logs the sitting', () => {
                expect(logged.map(entry => entry.text).some(text => text.startsWith('[sitting]'))).toBe(true);
            });
        `, passes(1, { weak: [COLLAPSED('x.some')] }));

        check('passes when the matcher names the value, so a failure shows it', spec`
            it('disables the buttons', () => {
                expect(buttons.filter(button => !button.disabled)).toEqual([]);
            });
        `, passes(1));

        check('passes on toContain', spec`
            it('logs the sitting', () => {
                expect(text).toContain('abc');
            });
        `, passes(1));

        check('passes when the call is inside a callback and the subject is a list', spec`
            it('finds no short names', () => {
                expect(names.filter(name => name.includes('a'))).toEqual([]);
            });
        `, passes(1));

        check('passes when the matcher is not a boolean one', spec`
            it('counts the matches', () => {
                expect(answers.filter(answer => answer.has(1)).length).toBe(2);
            });
        `, passes(1));

        // A chai suite asserts only in these forms, so the Vitest forms alone miss it.
        check('warns on some with chai to.eq(true)', spec`
            it('logs the correct answer', () => {
                expect(messages.some(message => message.includes('correct'))).to.eq(true);
            });
        `, passes(1, { weak: [COLLAPSED('x.some')] }));

        check('warns on every with chai to.be.true', spec`
            it('fills every answer slot', () => {
                expect(answers.every(answer => answer !== '')).to.be.true;
            });
        `, passes(1, { weak: [COLLAPSED('x.every')] }));

        check('warns on some with chai to.not.equal(true)', spec`
            it('logs no wrong answer', () => {
                expect(messages.some(message => message.includes('incorrectly'))).to.not.equal(true);
            });
        `, passes(1, { weak: [COLLAPSED('x.some')] }));

        check('warns on has with chai to.be.false', spec`
            it('drops the session', () => {
                expect(sessions.has('abc')).to.be.false;
            });
        `, passes(1, { weak: [COLLAPSED('x.has')] }));

        check('warns on every with chai to.eql(true)', spec`
            it('fills every answer slot', () => {
                expect(answers.every(answer => answer !== '')).to.eql(true);
            });
        `, passes(1, { weak: [COLLAPSED('x.every')] }));

        check('passes chai to.eq(false) on a value that is already a boolean', spec`
            it('has no winner yet', () => {
                expect(game.currentPlayerWon()).to.eq(false);
            });
        `, passes(1));
    });

    describe('a weak assertion', () => {
        check('warns on toBeDefined, which passes for any value', spec`
            it('stores a session', () => {
                expect(store.get('abc')).toBeDefined();
            });
        `, passes(1, { weak: ['spec.test.ts:2: toBeDefined()'] }));

        check('warns on toBeTruthy', spec`
            it('stores a session', () => {
                expect(store.get('abc')).toBeTruthy();
            });
        `, passes(1, { weak: ['spec.test.ts:2: toBeTruthy()'] }));

        check('warns on toBeFalsy', spec`
            it('clears the session', () => {
                expect(store.get('abc')).toBeFalsy();
            });
        `, passes(1, { weak: ['spec.test.ts:2: toBeFalsy()'] }));

        check('warns on expect(typeof …)', spec`
            it('stamps the session', () => {
                expect(typeof session.createdAt).toBe('number');
            });
        `, passes(1, { weak: ['spec.test.ts:2: expect(typeof …)'] }));

        check('warns on length > 0', spec`
            it('lists the sessions', () => {
                expect(store.list().length).toBeGreaterThan(0);
            });
        `, passes(1, { weak: ['spec.test.ts:2: length > 0'] }));

        check('warns on chai ok', spec`
            it('stores a session', () => {
                expect(store.get('abc')).to.be.ok;
            });
        `, passes(1, { weak: ['spec.test.ts:2: chai ok/exist'] }));

        check('warns on not.toBeNull, which passes for any value but null', spec`
            it('stores a session', () => {
                expect(store.get('abc')).not.toBeNull();
            });
        `, passes(1, { weak: ['spec.test.ts:2: not.toBeNull()/not.toBeUndefined()'] }));

        check('warns on not.toBeUndefined', spec`
            it('stores a session', () => {
                expect(store.get('abc')).not.toBeUndefined();
            });
        `, passes(1, { weak: ['spec.test.ts:2: not.toBeNull()/not.toBeUndefined()'] }));

        check('warns on toBeLessThan(0), where the test knows the exact value', spec`
            it('loses rating on a wrong answer', () => {
                expect(statistics.getNetMmr()).toBeLessThan(0);
            });
        `, passes(1, { weak: ['spec.test.ts:2: sign-only check against 0'] }));

        check('warns on toBeGreaterThan(0) on a value that is not a length', spec`
            it('earns rating', () => {
                expect(body.currentPlayerMMR).toBeGreaterThan(0);
            });
        `, passes(1, { weak: ['spec.test.ts:2: sign-only check against 0'] }));

        check('warns on the OrEqual forms against 0', spec`
            it('keeps the progress in range', () => {
                expect(progress).toBeGreaterThanOrEqual(0);
                expect(progress).toBeLessThanOrEqual(0);
            });
        `, passes(1, { weak: ['spec.test.ts:2: sign-only check against 0', 'spec.test.ts:3: sign-only check against 0'] }));

        check('reports a length check once, as length > 0', spec`
            it('lists the sessions', () => {
                expect(store.list().length).toBeGreaterThan(0);
            });
        `, passes(1, { weak: ['spec.test.ts:2: length > 0'] }));

        check('passes on a bound other than 0', spec`
            it('earns the starting rating', () => {
                expect(body.currentPlayerMMR).toBeGreaterThan(STARTING_MMR);
            });
        `, passes(1));

        check('passes on exists(), where presence is the whole contract', spec`
            it('renders the modal', () => {
                expect(wrapper.find('#statistics-modal').exists()).toBe(true);
            });
        `, passes(1));

        check('passes when the test checks the exact value it knows', spec`
            it('stores a session', () => {
                expect(store.get('abc')).toEqual({ id: 'abc', questionerType: 'developer' });
            });
        `, passes(1));

        check('passes on toBeUndefined, which names one exact value', spec`
            it('clears the session', () => {
                expect(store.get('abc')).toBeUndefined();
            });
        `, passes(1));
    });

    // The expected value read from the code under test passes when that value
    // is wrong: drafted-topics.test.js read MAX_DRAFTED_TAGS from
    // player-questioner.js, so a 20 there would still pass.
    describe('an expected value that is a name, not a literal', () => {
        check('fails when the expected value is imported from the code under test', spec`
            import { MAX_DRAFTED_TAGS } from '../src/player-questioner.js';
            it('caps the drafted tags', () => {
                expect(maxTags).toBe(MAX_DRAFTED_TAGS);
            });
        `, fails(1, { importedExpected: [
            'spec.test.ts:3: MAX_DRAFTED_TAGS is imported from ../src/player-questioner.js, the code under test; write the expected value as a literal',
        ] }));

        check('fails when the name comes through require', spec`
            const { MAX_DRAFTED_TAGS } = require('../src/player-questioner.js');
            it('drafts no more than the cap', () => {
                expect(sitting.draftedTags).toHaveLength(MAX_DRAFTED_TAGS);
            });
        `, fails(1, { importedExpected: [
            'spec.test.ts:3: MAX_DRAFTED_TAGS is imported from ../src/player-questioner.js, the code under test; write the expected value as a literal',
        ] }));

        check('fails when the expected value is read off an imported table', spec`
            import { FACTOR_LABELS } from '../src/work-style-question.js';
            it('names the leading factor', () => {
                expect(questioner.getPersonalityType()).toBe(FACTOR_LABELS['patience']);
            });
        `, fails(1, { importedExpected: [
            'spec.test.ts:3: FACTOR_LABELS is imported from ../src/work-style-question.js, the code under test; write the expected value as a literal',
        ] }));

        check('fails with chai eq', spec`
            import { STARTING_MMR } from '../src/player.js';
            it('starts a player at the starting MMR', () => {
                expect(player.mmr).to.eq(STARTING_MMR);
            });
        `, fails(1, { importedExpected: [
            'spec.test.ts:3: STARTING_MMR is imported from ../src/player.js, the code under test; write the expected value as a literal',
        ] }));

        check('passes an identity check on an imported object', spec`
            import { trackById, backendDeveloperTrack } from '../src/role-track.js';
            it('finds the backend developer track', () => {
                expect(trackById('backend-developer')).toBe(backendDeveloperTrack);
            });
        `, passes(1));

        check('passes a name from support, which is test code', spec`
            import { HOST } from './support/api';
            it('posts to the host', () => {
                expect(url).toBe(HOST);
            });
        `, passes(1));

        check('passes an imported name used as an input', spec`
            import { MAX_DRAFTED_TAGS } from '../src/player-questioner.js';
            it('refuses one tag over the cap', () => {
                expect(draft(MAX_DRAFTED_TAGS + 1).statusCode).toBe(400);
            });
        `, passes(1));

        check('warns when a local const only names the expected literal', spec`
            const SITTING = 99;
            it('asks the whole sitting', () => {
                expect(questioner.totalQuestionsNeeded).toBe(SITTING);
            });
        `, passes(1, { namedLiteral: [
            'spec.test.ts:3: SITTING names a literal; write the literal as the expected value',
        ] }));

        check('passes a local literal used as an input', spec`
            const RIGHT_ON_A_ZERO_DRAW = 3;
            it('marks the right answer correct', () => {
                expect(answer(RIGHT_ON_A_ZERO_DRAW).correctAnswer).toBe(true);
            });
        `, passes(1));

        check('passes an object the test saved and reads back', spec`
            const SITTING = { sessionId: 'session-1', playerName: 'Evan' };
            it('reads back a saved sitting', async () => {
                await repository.save(SITTING);
                expect(await repository.findById('session-1')).toEqual(SITTING);
            });
        `, passes(1));

        check('passes the literal', spec`
            it('asks the whole sitting', () => {
                expect(questioner.totalQuestionsNeeded).toBe(99);
            });
        `, passes(1));

        check('fails when the name comes through await import()', spec`
            it('caps the drafted tags', async () => {
                const { MAX_DRAFTED_TAGS } = await import('../src/player-questioner.js');
                expect(maxTags).toBe(MAX_DRAFTED_TAGS);
            });
        `, fails(1, { importedExpected: [
            'spec.test.ts:3: MAX_DRAFTED_TAGS is imported from ../src/player-questioner.js, the code under test; write the expected value as a literal',
        ] }));

        check('fails under the alias the spec gives the import', spec`
            import { MAX_DRAFTED_TAGS as TAG_CAP } from '../src/player-questioner.js';
            it('caps the drafted tags', () => {
                expect(maxTags).toBe(TAG_CAP);
            });
        `, fails(1, { importedExpected: [
            'spec.test.ts:3: TAG_CAP is imported from ../src/player-questioner.js, the code under test; write the expected value as a literal',
        ] }));

        check('passes an import inside a comment', spec`
            // import { MAX_DRAFTED_TAGS } from '../src/player-questioner.js';
            const MAX_DRAFTED_TAGS = readCap();
            it('caps the drafted tags', () => {
                expect(maxTags).toBe(MAX_DRAFTED_TAGS);
            });
        `, passes(1));

        check('passes a literal const inside a block comment', spec`
            /*
            const SITTING = 99;
            */
            const SITTING = questionsIn(bank);
            it('asks the whole sitting', () => {
                expect(questioner.totalQuestionsNeeded).toBe(SITTING);
            });
        `, passes(1));

        check('warns on a string const as well as a number', spec`
            const DEV_ORIGIN = 'http://localhost:5173';
            it('allows the dev origin', () => {
                expect(allowedOrigin('dev')).toBe(DEV_ORIGIN);
            });
        `, passes(1, { namedLiteral: [
            'spec.test.ts:3: DEV_ORIGIN names a literal; write the literal as the expected value',
        ] }));
    });
});
