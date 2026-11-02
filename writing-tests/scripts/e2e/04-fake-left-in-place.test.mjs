import { describe } from 'node:test';
import { check, code, fails, passes, spec } from './validator-cli.mjs';

describe('4. A fake, spy or stub left in place after the test', () => {
    describe('fake timers', () => {
        check('fails when nothing restores the real timers', spec`
            beforeEach(() => vi.useFakeTimers());

            it('expires the session', () => {
                vi.advanceTimersByTime(EIGHT_HOURS);
                expect(store.size).toBe(0);
            });
        `, fails(1, { leak: ['spec.test.ts:1: useFakeTimers() with no useRealTimers() in an afterEach or afterAll'] }));

        check('fails when the restore is at the end of the test, where a failed assertion skips it', spec`
            it('expires the session', () => {
                vi.useFakeTimers();
                vi.advanceTimersByTime(EIGHT_HOURS);
                expect(store.size).toBe(0);
                vi.useRealTimers();
            });
        `, fails(1, { leak: ['spec.test.ts:2: useFakeTimers() with no useRealTimers() in an afterEach or afterAll'] }));

        check('fails when a try/finally restores them, which is also control flow', spec`
            it('expires the session', () => {
                vi.useFakeTimers();
                try {
                    vi.advanceTimersByTime(EIGHT_HOURS);
                    expect(store.size).toBe(0);
                } finally {
                    vi.useRealTimers();
                }
            });
        `, fails(1, {
            controlFlow: ['spec.test.ts:3: try/catch inside a test body (test starts line 1)'],
            leak: ['spec.test.ts:2: useFakeTimers() with no useRealTimers() in an afterEach or afterAll'],
        }));

        check('passes when an afterEach restores them', spec`
            beforeEach(() => vi.useFakeTimers());
            afterEach(() => vi.useRealTimers());

            it('expires the session', () => {
                vi.advanceTimersByTime(EIGHT_HOURS);
                expect(store.size).toBe(0);
            });
        `, passes(1));

        check('passes when an afterAll restores timers that a beforeAll faked', spec`
            beforeAll(() => vi.useFakeTimers());
            afterAll(() => vi.useRealTimers());

            it('expires the session', () => {
                vi.advanceTimersByTime(EIGHT_HOURS);
                expect(store.size).toBe(0);
            });
        `, passes(1));
    });

    describe('spies', () => {
        check('fails when nothing restores the spy', spec`
            it('logs a failed save', () => {
                const log = vi.spyOn(console, 'error');
                save(brokenSession);
                expect(log).toHaveBeenCalledWith('save failed');
            });
        `, fails(1, { leak: ['spec.test.ts:2: spyOn() with no restoreAllMocks() or mockRestore() in an afterEach or afterAll'] }));

        check('fails when mockRestore is at the end of the test', spec`
            it('logs a failed save', () => {
                const log = vi.spyOn(console, 'error');
                save(brokenSession);
                expect(log).toHaveBeenCalledWith('save failed');
                log.mockRestore();
            });
        `, fails(1, { leak: ['spec.test.ts:2: spyOn() with no restoreAllMocks() or mockRestore() in an afterEach or afterAll'] }));

        check('passes when an afterEach restores all mocks', spec`
            afterEach(() => vi.restoreAllMocks());

            it('logs a failed save', () => {
                const log = vi.spyOn(console, 'error');
                save(brokenSession);
                expect(log).toHaveBeenCalledWith('save failed');
            });
        `, passes(1));

        check('passes when an afterEach restores the one spy', spec`
            let log;
            beforeEach(() => {
                log = vi.spyOn(console, 'error');
            });
            afterEach(() => log.mockRestore());

            it('logs a failed save', () => {
                save(brokenSession);
                expect(log).toHaveBeenCalledWith('save failed');
            });
        `, passes(1));
    });

    describe('stubbed globals', () => {
        check('fails when nothing unstubs the global', spec`
            it('shows the score', async () => {
                vi.stubGlobal('fetch', vi.fn().mockResolvedValue(scoreResponse));
                expect(await loadScore()).toBe(3);
            });
        `, fails(1, { leak: ['spec.test.ts:2: stubGlobal() with no unstubAllGlobals() in an afterEach or afterAll'] }));

        check('fails when the afterEach only restores mocks, which leaves globals stubbed', spec`
            afterEach(() => vi.restoreAllMocks());

            it('shows the score', async () => {
                vi.stubGlobal('fetch', vi.fn().mockResolvedValue(scoreResponse));
                expect(await loadScore()).toBe(3);
            });
        `, fails(1, { leak: ['spec.test.ts:4: stubGlobal() with no unstubAllGlobals() in an afterEach or afterAll'] }));

        check('passes when an afterEach unstubs all globals', spec`
            afterEach(() => vi.unstubAllGlobals());

            it('shows the score', async () => {
                vi.stubGlobal('fetch', vi.fn().mockResolvedValue(scoreResponse));
                expect(await loadScore()).toBe(3);
            });
        `, passes(1));
    });

    describe('stubbed environment', () => {
        check('fails when nothing unstubs the environment', spec`
            it('reads the database URL', () => {
                vi.stubEnv('DATABASE_URL', 'postgres://test');
                expect(databaseUrl()).toBe('postgres://test');
            });
        `, fails(1, { leak: ['spec.test.ts:2: stubEnv() with no unstubAllEnvs() in an afterEach or afterAll'] }));

        check('passes when an afterEach unstubs all environment variables', spec`
            afterEach(() => vi.unstubAllEnvs());

            it('reads the database URL', () => {
                vi.stubEnv('DATABASE_URL', 'postgres://test');
                expect(databaseUrl()).toBe('postgres://test');
            });
        `, passes(1));
    });

    describe('an assigned Math.random', () => {
        check('fails when nothing assigns the original back, though the assignment controls the draw', spec`
            beforeEach(() => {
                Math.random = () => 0;
            });

            it('picks a question', () => {
                expect(questionAt(Math.random())).toBe(firstQuestion);
            });
        `, fails(1, { leak: ['spec.test.ts:2: Math.random = … with no Math.random = original in an afterEach or afterAll'] }));

        check('fails when the original goes back at the end of the test', spec`
            const random = Math.random;

            it('picks a question', () => {
                Math.random = () => 0;
                expect(questionAt(Math.random())).toBe(firstQuestion);
                Math.random = random;
            });
        `, fails(1, { leak: [
            'spec.test.ts:4: Math.random = … with no Math.random = original in an afterEach or afterAll',
            'spec.test.ts:6: Math.random = … with no Math.random = original in an afterEach or afterAll',
        ] }));

        check('passes when an afterEach assigns the original back', spec`
            const random = Math.random;
            beforeEach(() => {
                Math.random = () => 0;
            });
            afterEach(() => {
                Math.random = random;
            });

            it('picks a question', () => {
                expect(questionAt(Math.random())).toBe(firstQuestion);
            });
        `, passes(1));
    });

    describe('a Jest replaced property', () => {
        check('fails when nothing restores the property', spec`
            it('reads the test database URL', () => {
                jest.replaceProperty(config, 'databaseUrl', 'postgres://test');
                expect(databaseUrl()).toBe('postgres://test');
            });
        `, fails(1, { leak: ['spec.test.ts:2: replaceProperty() with no restoreAllMocks() or restore() in an afterEach or afterAll'] }));

        check('passes when an afterEach restores all mocks', spec`
            afterEach(() => jest.restoreAllMocks());

            it('reads the test database URL', () => {
                jest.replaceProperty(config, 'databaseUrl', 'postgres://test');
                expect(databaseUrl()).toBe('postgres://test');
            });
        `, passes(1));
    });

    describe('sinon fakes in a Mocha file', () => {
        check('fails when nothing restores the stub', spec`
            it('logs a failed save', () => {
                const log = sinon.stub(console, 'error');
                save(brokenSession);
                sinon.assert.calledWith(log, 'save failed');
            });
        `, fails(1, { leak: ['spec.test.ts:2: sinon.stub(), spy() or replace() with no restore() or sinon.restore() in an afterEach or afterAll'] }));

        check('fails when the stub is restored at the end of the test, where a failed assertion skips it', spec`
            it('logs a failed save', () => {
                const log = sinon.spy(console, 'error');
                save(brokenSession);
                sinon.assert.calledWith(log, 'save failed');
                log.restore();
            });
        `, fails(1, { leak: ['spec.test.ts:2: sinon.stub(), spy() or replace() with no restore() or sinon.restore() in an afterEach or afterAll'] }));

        check('passes when a Mocha afterEach restores the default sandbox', spec`
            afterEach(() => sinon.restore());

            it('logs a failed save', () => {
                const log = sinon.spy(console, 'error');
                save(brokenSession);
                sinon.assert.calledWith(log, 'save failed');
            });
        `, passes(1));

        check('passes when a Mocha after restores a replace from a before', spec`
            before(() => sinon.replace(config, 'retries', 0));
            after(() => sinon.restore());

            it('gives up on the first failure', () => {
                sinon.assert.notCalled(retry);
            });
        `, passes(1));

        check('fails when nothing restores the fake clock', spec`
            let clock;
            beforeEach(() => {
                clock = sinon.useFakeTimers();
            });

            it('expires the session', () => {
                clock.tick(EIGHT_HOURS);
                expect(store.size).to.equal(0);
            });
        `, fails(1, { leak: ['spec.test.ts:3: sinon.useFakeTimers() with no clock.restore() or sinon.restore() in an afterEach or afterAll'] }));

        check('passes when an afterEach restores the fake clock', spec`
            let clock;
            beforeEach(() => {
                clock = sinon.useFakeTimers();
            });
            afterEach(() => clock.restore());

            it('expires the session', () => {
                clock.tick(EIGHT_HOURS);
                expect(store.size).to.equal(0);
            });
        `, passes(1));
    });

    describe('a stub set up in a support helper', () => {
        const STUB_SCORE = code`
            export const stubScore = score => {
                vi.stubGlobal('fetch', vi.fn().mockResolvedValue(score));
            };

            export const restoreStubs = () => vi.unstubAllGlobals();
        `;

        check('fails at the call site when the spec never unstubs the global', {
            'support/stubs.ts': STUB_SCORE,
            'spec.test.ts': code`
                import { stubScore } from './support/stubs';

                it('shows the score', async () => {
                    stubScore(scoreResponse);
                    expect(await loadScore()).toBe(3);
                });
            `,
        }, fails(1, { leak: ['spec.test.ts:4: stubGlobal() in stubScore() from ./support/stubs, with no unstubAllGlobals() in an afterEach or afterAll'] }));

        check('fails under the name the spec imports it as, from a function declaration', {
            'support/stubs.ts': code`
                export function stubScore(score) {
                    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(score));
                }
            `,
            'spec.test.ts': code`
                import { stubScore as stub } from './support/stubs';

                it('shows the score', async () => {
                    stub(scoreResponse);
                    expect(await loadScore()).toBe(3);
                });
            `,
        }, fails(1, { leak: ['spec.test.ts:4: stubGlobal() in stub() from ./support/stubs, with no unstubAllGlobals() in an afterEach or afterAll'] }));

        check('fails when the spec imports the restore helper and never calls it', {
            'support/stubs.ts': STUB_SCORE,
            'spec.test.ts': code`
                import { restoreStubs, stubScore } from './support/stubs';

                it('shows the score', async () => {
                    stubScore(scoreResponse);
                    expect(await loadScore()).toBe(3);
                });
            `,
        }, fails(1, { leak: ['spec.test.ts:4: stubGlobal() in stubScore() from ./support/stubs, with no unstubAllGlobals() in an afterEach or afterAll'] }));

        check('passes when an afterEach in the spec unstubs all globals', {
            'support/stubs.ts': STUB_SCORE,
            'spec.test.ts': code`
                import { stubScore } from './support/stubs';

                afterEach(() => vi.unstubAllGlobals());

                it('shows the score', async () => {
                    stubScore(scoreResponse);
                    expect(await loadScore()).toBe(3);
                });
            `,
        }, passes(1));

        check('passes when the spec passes the restore helper to an afterEach', {
            'support/stubs.ts': STUB_SCORE,
            'spec.test.ts': code`
                import { restoreStubs, stubScore } from './support/stubs';

                afterEach(restoreStubs);

                it('shows the score', async () => {
                    stubScore(scoreResponse);
                    expect(await loadScore()).toBe(3);
                });
            `,
        }, passes(1));

        check('passes when the helper registers its own afterEach, and the spec calls the helper', {
            'support/stubs.ts': code`
                export function useScoreStub(score) {
                    beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(score)));
                    afterEach(() => vi.unstubAllGlobals());
                }
            `,
            'spec.test.ts': code`
                import { useScoreStub } from './support/stubs';

                useScoreStub(scoreResponse);

                it('shows the score', async () => {
                    expect(await loadScore()).toBe(3);
                });
            `,
        }, passes(1));
    });

    describe('a stub set up in a helper loaded with await import()', () => {
        const STUB_SCORE = code`
            export const stubScore = score => {
                vi.stubGlobal('fetch', vi.fn().mockResolvedValue(score));
            };
        `;

        check('fails at the call site when the spec never unstubs the global', {
            'support/stubs.ts': STUB_SCORE,
            'spec.test.ts': code`
                it('shows the score', async () => {
                    const { stubScore } = await import('./support/stubs');
                    stubScore(scoreResponse);
                    expect(await loadScore()).toBe(3);
                });
            `,
        }, fails(1, { leak: ['spec.test.ts:3: stubGlobal() in stubScore() from ./support/stubs, with no unstubAllGlobals() in an afterEach or afterAll'] }));

        check('fails under the name that a destructured rename gives it', {
            'support/stubs.ts': STUB_SCORE,
            'spec.test.ts': code`
                it('shows the score', async () => {
                    const { stubScore: stub } = await import('./support/stubs');
                    stub(scoreResponse);
                    expect(await loadScore()).toBe(3);
                });
            `,
        }, fails(1, { leak: ['spec.test.ts:3: stubGlobal() in stub() from ./support/stubs, with no unstubAllGlobals() in an afterEach or afterAll'] }));

        check('passes when an afterEach in the spec unstubs all globals', {
            'support/stubs.ts': STUB_SCORE,
            'spec.test.ts': code`
                afterEach(() => vi.unstubAllGlobals());

                it('shows the score', async () => {
                    const { stubScore } = await import('./support/stubs');
                    stubScore(scoreResponse);
                    expect(await loadScore()).toBe(3);
                });
            `,
        }, passes(1));

        check('passes when the helper does not stub anything', {
            'support/stubs.ts': 'export const loadScoreFor = name => name;\n',
            'spec.test.ts': code`
                it('shows the score', async () => {
                    const { loadScoreFor } = await import('./support/stubs');
                    expect(loadScoreFor('ada')).toBe('ada');
                });
            `,
        }, passes(1));
    });
});
