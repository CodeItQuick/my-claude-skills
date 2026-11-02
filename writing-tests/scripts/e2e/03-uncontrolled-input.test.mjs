import { describe } from 'node:test';
import { check, fails, passes, spec } from './validator-cli.mjs';

describe('3. An input that the test does not control', () => {
    describe('the clock', () => {
        check('fails on Date.now(), which moves between runs', spec`
            it('keeps a fresh session', () => {
                session.createdAt = Date.now();
                expect(store.cleanup()).toEqual([]);
            });
        `, fails(1, { ambient: ['spec.test.ts:2: Date.now() inside a test body, and the file does not control it'] }));

        check('fails on new Date() with no argument', spec`
            it('keeps a fresh session', () => {
                session.createdAt = new Date();
                expect(store.cleanup()).toEqual([]);
            });
        `, fails(1, { ambient: ['spec.test.ts:2: new Date() inside a test body, and the file does not control it'] }));

        check('fails when the fake timers are only in a comment', spec`
            // vi.useFakeTimers() runs in the setup file.
            it('keeps a fresh session', () => {
                session.createdAt = Date.now();
                expect(store.cleanup()).toEqual([]);
            });
        `, fails(1, { ambient: ['spec.test.ts:3: Date.now() inside a test body, and the file does not control it'] }));

        check('passes when fake timers fix the clock, and an afterEach restores it', spec`
            beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-11-01')));
            afterEach(() => vi.useRealTimers());

            it('keeps a fresh session', () => {
                session.createdAt = Date.now();
                expect(store.cleanup()).toEqual([]);
            });
        `, passes(1));

        check('passes with jest fake timers, restored the same way', spec`
            beforeEach(() => jest.useFakeTimers());
            afterEach(() => jest.useRealTimers());

            it('keeps a fresh session', () => {
                session.createdAt = Date.now();
                expect(store.cleanup()).toEqual([]);
            });
        `, passes(1));

        check('passes with sinon fake timers, restored in an afterEach', spec`
            let clock;
            beforeEach(() => {
                clock = sinon.useFakeTimers(new Date('2026-11-01'));
            });
            afterEach(() => clock.restore());

            it('keeps a fresh session', () => {
                session.createdAt = Date.now();
                expect(store.cleanup()).to.deep.equal([]);
            });
        `, passes(1));

        check('fails when sinon fakes the clock and nothing restores it', spec`
            beforeEach(() => sinon.useFakeTimers(new Date('2026-11-01')));

            it('keeps a fresh session', () => {
                session.createdAt = Date.now();
                expect(store.cleanup()).to.deep.equal([]);
            });
        `, fails(1, { leak: ['spec.test.ts:1: sinon.useFakeTimers() with no clock.restore() or sinon.restore() in an afterEach or afterAll'] }));

        check('warns on Date.now() in a helper, which moves the clock one function out', spec`
            const stamp = () => Date.now();

            it('keeps a fresh session', () => {
                session.createdAt = stamp();
                expect(store.cleanup()).toEqual([]);
            });
        `, passes(1, { helperAmbient: ['spec.test.ts:1: Date.now() in a test-file helper, and the file does not control it (helper starts line 1)'] }));

        check('passes on Date.now() in a helper when fake timers fix the clock', spec`
            beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-11-01')));
            afterEach(() => vi.useRealTimers());

            const stamp = () => Date.now();

            it('keeps a fresh session', () => {
                session.createdAt = stamp();
                expect(store.cleanup()).toEqual([]);
            });
        `, passes(1));

        check('passes on a fixed date, which is the same on every run', spec`
            it('keeps a fresh session', () => {
                session.createdAt = new Date('2026-11-01');
                expect(store.cleanup()).toEqual([]);
            });
        `, passes(1));

        check('warns on Date.now() in a hook, which sets up every test in the block', spec`
            let startedAt;
            beforeEach(() => { startedAt = Date.now(); });
            it('keeps a fresh session', () => {
                expect(store.cleanup(startedAt)).toEqual([]);
            });
        `, passes(1, { helperAmbient: ['spec.test.ts:2: Date.now() in a test-file hook, and the file does not control it (hook starts line 2)'] }));
    });

    describe('the random draw', () => {
        check('fails on Math.random(), which draws again on every run', spec`
            it('picks a question', () => {
                const pick = Math.random();
                expect(questionAt(pick)).toBe(firstQuestion);
            });
        `, fails(1, { ambient: ['spec.test.ts:2: Math.random() inside a test body, and the file does not control it'] }));

        check('fails when the file fakes only the clock, which does not fix the draw', spec`
            beforeEach(() => vi.useFakeTimers());
            afterEach(() => vi.useRealTimers());

            it('picks a question', () => {
                const pick = Math.random();
                expect(questionAt(pick)).toBe(firstQuestion);
            });
        `, fails(1, { ambient: ['spec.test.ts:5: Math.random() inside a test body, and the file does not control it'] }));

        check('passes when a spy fixes the draw, and an afterEach restores it', spec`
            beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0));
            afterEach(() => vi.restoreAllMocks());

            it('picks a question', () => {
                const pick = Math.random();
                expect(questionAt(pick)).toBe(firstQuestion);
            });
        `, passes(1));
    });

    describe('the environment', () => {
        const ENVIRONMENT = "process.env inside a test body; stub it with your runner's env stub and restore it in an after-hook";

        check('warns on a read of process.env, which differs between machines', spec`
            it('connects to the database', () => {
                expect(databaseUrl()).toBe(process.env.DATABASE_URL);
            });
        `, passes(1, { environment: [`spec.test.ts:2: ${ENVIRONMENT}`] }));

        check('warns on a write to process.env, which the next test inherits', spec`
            it('uses the test database', () => {
                process.env.DATABASE_URL = 'postgres://test';
                expect(databaseUrl()).toBe('postgres://test');
            });
        `, passes(1, { environment: [`spec.test.ts:2: ${ENVIRONMENT}`] }));

        check('passes when vi.stubEnv sets the value and an afterEach unstubs it', spec`
            afterEach(() => vi.unstubAllEnvs());

            it('reads the stubbed URL', () => {
                vi.stubEnv('DATABASE_URL', 'postgres://test');
                expect(process.env.DATABASE_URL).toBe('postgres://test');
            });
        `, passes(1));

        check('passes when jest.replaceProperty replaces process.env and an afterEach restores it', spec`
            afterEach(() => jest.restoreAllMocks());

            it('reads the replaced URL', () => {
                jest.replaceProperty(process, 'env', { DATABASE_URL: 'postgres://test' });
                expect(process.env.DATABASE_URL).toBe('postgres://test');
            });
        `, passes(1));

        check('passes when sinon stubs process.env and an afterEach restores it', spec`
            afterEach(() => sinon.restore());

            it('reads the stubbed URL', () => {
                sinon.stub(process, 'env').value({ DATABASE_URL: 'postgres://test' });
                expect(process.env.DATABASE_URL).to.equal('postgres://test');
            });
        `, passes(1));

        check('warns when sinon stubs a process property other than env', spec`
            afterEach(() => sinon.restore());

            it('exits on a missing URL', () => {
                const exit = sinon.stub(process, 'exit');
                delete process.env.DATABASE_URL;
                start();
                sinon.assert.calledWith(exit, 1);
            });
        `, passes(1, { environment: [`spec.test.ts:5: ${ENVIRONMENT}`] }));

        check('warns when the sinon stub of process.env is only in a comment', spec`
            // sinon.stub(process, 'env') runs in the setup file.
            it('connects to the database', () => {
                expect(databaseUrl()).to.equal(process.env.DATABASE_URL);
            });
        `, passes(1, { environment: [`spec.test.ts:3: ${ENVIRONMENT}`] }));

        check('passes on process.env at module level, which no test body holds', spec`
            const URL = process.env.DATABASE_URL;

            it('connects to the database', () => {
                expect(databaseUrl()).toBe(URL);
            });
        `, passes(1));
    });

    describe('the network', () => {
        check('warns on fetch to a real URL, which fails when the host is down', spec`
            it('loads the score', async () => {
                const response = await fetch('https://api.example.com/score');
                expect(response.status).toBe(200);
            });
        `, passes(1, { network: ['spec.test.ts:2: a real network call inside a test body'] }));

        check('warns on axios to a real URL', spec`
            it('loads the score', async () => {
                const response = await axios.get('http://localhost:3000/api/score');
                expect(response.status).toBe(200);
            });
        `, passes(1, { network: ['spec.test.ts:2: a real network call inside a test body'] }));

        check('passes when the file stubs fetch, and an afterEach unstubs it', spec`
            beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 })));
            afterEach(() => vi.unstubAllGlobals());

            it('loads the score', async () => {
                const response = await fetch('https://api.example.com/score');
                expect(response.status).toBe(200);
            });
        `, passes(1));

        check('passes when sinon stubs global fetch, and an afterEach restores it', spec`
            beforeEach(() => sinon.stub(global, 'fetch').resolves({ status: 200 }));
            afterEach(() => sinon.restore());

            it('loads the score', async () => {
                const response = await fetch('https://api.example.com/score');
                expect(response.status).to.equal(200);
            });
        `, passes(1));

        check('passes when jest.spyOn replaces globalThis.fetch, and an afterEach restores it', spec`
            beforeEach(() => jest.spyOn(globalThis, 'fetch').mockResolvedValue({ status: 200 }));
            afterEach(() => jest.restoreAllMocks());

            it('loads the score', async () => {
                const response = await fetch('https://api.example.com/score');
                expect(response.status).toBe(200);
            });
        `, passes(1));

        check('warns when sinon stubs a client method, not the global fetch', spec`
            beforeEach(() => sinon.stub(client, 'retry'));
            afterEach(() => sinon.restore());

            it('loads the score', async () => {
                const response = await fetch('https://api.example.com/score');
                expect(response.status).to.equal(200);
            });
        `, passes(1, { network: ['spec.test.ts:5: a real network call inside a test body'] }));

        check('passes on a relative URL, which names no host', spec`
            it('builds the score request', () => {
                expect(requestFor('/api/score').url).toBe('/api/score');
            });
        `, passes(1));

        check('passes in a Playwright file, where the network is what the test checks', spec`
            import { test, expect } from '@playwright/test';

            test('serves the health check', async () => {
                const response = await fetch('http://localhost:3000/health');
                expect(response.status).toBe(200);
            });
        `, passes(1));
    });
});
