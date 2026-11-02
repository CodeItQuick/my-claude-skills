// Runs the validator CLI on small test files, for the e2e taxonomy in this
// folder. Each file is one family of test smell, each describe in it is one
// rule, and each case is the smallest code that shows one variant of it.
//
// Every case checks the exit code and the whole report, so a case cannot pass
// while its code also breaks a second rule. The unit tests in
// ../validate-tests.test.mjs cover the functions; these cover the CLI.
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VALIDATOR = join(dirname(fileURLToPath(import.meta.url)), '..', 'validate-tests.mjs');

/** A code block written indented in this file, with the common indent removed. */
export function code([text]) {
    const lines = text.replace(/^\n/, '').trimEnd().split('\n');
    const indent = Math.min(...lines.filter(line => line.trim()).map(line => line.match(/^ */)[0].length));
    return `${lines.map(line => line.slice(indent)).join('\n')}\n`;
}

/** One spec file, `spec.test.ts`, holding the code block. */
export const spec = strings => ({ 'spec.test.ts': code(strings) });

/**
 * Writes `files` into a fresh folder and runs the validator CLI there.
 * `flags` go to the CLI before the folder, such as `--info`.
 * Returns its exit code and its report. The folder is removed after the test.
 */
function validate(context, files, flags, paths) {
    const folder = mkdtempSync(join(tmpdir(), 'validate-tests-'));
    context.after(() => rmSync(folder, { recursive: true }));
    Object.entries(files).forEach(([name, source]) => {
        mkdirSync(dirname(join(folder, name)), { recursive: true });
        writeFileSync(join(folder, name), source);
    });

    const run = spawnSync(process.execPath, [VALIDATOR, ...flags, ...paths], { cwd: folder, encoding: 'utf8' });
    return { status: run.status, report: run.stdout };
}

/** Each kind of finding and its heading, in the order the report prints them. */
const SECTIONS = [
    ['mockedOwn', 'Info — mock of your own module'],
    ['reassigned', 'Info — variable reassigned inside a test'],
    ['helper', 'Warnings — control flow in a helper'],
    ['hookFlow', 'Warnings — control flow in a hook'],
    ['helperAmbient', 'Warnings — ambient state in a helper or hook'],
    ['helperSleep', 'Warnings — fixed sleep in a helper or hook'],
    ['sameName', 'Warnings — one helper name, different bodies'],
    ['weak', 'Warnings — weak assertion inside a test'],
    ['namedLiteral', 'Warnings — local name for a literal as the expected value'],
    ['computed', 'Warnings — expected value computed with arithmetic'],
    ['environment', 'Warnings — process.env inside a test'],
    ['network', 'Warnings — real network call inside a test'],
    ['held', 'Warnings — one-time read held in a variable, then asserted'],
    ['logged', 'Warnings — console output inside a test'],
    ['shared', 'Warnings — state shared between tests'],
    ['longTest', 'Warnings — long test body'],
    ['copied', 'Failures — copied helper'],
    ['controlFlow', 'Failures — control flow inside a test'],
    ['ambient', 'Failures — ambient state inside a test'],
    ['sleep', 'Failures — fixed sleep inside a test'],
    ['unasserted', 'Failures — test with no assertion'],
    ['folded', 'Failures — comparison folded into a boolean assertion'],
    ['importedExpected', 'Failures — expected value imported from the code under test'],
    ['twice', 'Failures — same test body twice'],
    ['leak', 'Failures — a fake, spy or stub left in place after the test'],
    ['focused', 'Failures — .only left in a file'],
    ['unawaited', 'Failures — async assertion with no await'],
    ['unretried', 'Failures — one-time read inside an e2e assertion'],
];

const sections = findings => SECTIONS
    .filter(([kind]) => kind in findings)
    .map(([kind, heading]) => `\n${heading} (${findings[kind].length}):\n${findings[kind].map(entry => `  ${entry}\n`).join('')}`)
    .join('');

/** The run fails: exit 1, and the report lists `findings` by kind. */
export const fails = (files, findings) => ({ status: 1, report: `Test files: ${files}\n${sections(findings)}` });

/** The run passes: exit 0, with any info and warnings in `findings` listed first. */
export const passes = (files, findings = {}) => ({
    status: 0,
    report: `Test files: ${files}\n${sections(findings)}\nNo test-body failure, and no copied helper or test.\n`,
});

/** One case: the validator's result on `files`, run with `flags`, is exactly `expected`. */
export function check(title, files, expected, flags = [], paths = ['.']) {
    it(title, context => assert.deepEqual(validate(context, files, flags, paths), expected));
}
