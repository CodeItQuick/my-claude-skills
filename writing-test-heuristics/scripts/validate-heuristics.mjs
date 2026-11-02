#!/usr/bin/env node
/**
 * Checks the heuristic files in writing-tests/references/ against the
 * validator's report sections.
 *
 * Failures: a heuristic file with a missing field, or one whose "Backed in
 * code" names a section key the validator does not have.
 * Report: each judged section (a warning or info) and the heuristic that
 * decides its hits, or "none yet".
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** writing-tests sits next to this skill, in the same skills folder. */
const WRITING_TESTS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'writing-tests');
const REFERENCES = join(WRITING_TESTS, 'references');
const CLI = join(WRITING_TESTS, 'scripts', 'e2e', 'validator-cli.mjs');

export const FIELDS = ['Rule', 'Apply it', 'Backed in code', 'Evidence', 'Found by', 'Why no script'];

/** Every report section in validator-cli.mjs, as { key, level, heading }. */
export const sectionsIn = cliSource => [...cliSource.matchAll(/\['(\w+)', '(Info|Warnings|Failures) — ([^']+)'\]/g)]
    .map(([, key, level, heading]) => ({ key, level, heading }));

/** The section keys that a heuristic's "Backed in code" field names in backticks. */
export function backedKeys(source, keys) {
    const field = source.match(/\*\*Backed in code:\*\*([\s\S]*?)(?=\n\*\*[A-Z][\w ]*:\*\*|$)/);
    return field ? [...field[1].matchAll(/`(\w+)`/g)].map(match => match[1]).filter(name => keys.includes(name)) : [];
}

export const missingFields = source => FIELDS.filter(field => !source.includes(`**${field}:**`));

export function main() {
    const sections = sectionsIn(readFileSync(CLI, 'utf8'));
    const keys = sections.map(section => section.key);
    const failures = [];
    const deciders = new Map();
    // evidence.md holds the claims that the heuristics cite. It is not a heuristic.
    for (const name of readdirSync(REFERENCES).filter(file => file.endsWith('.md') && file !== 'evidence.md').sort()) {
        const source = readFileSync(join(REFERENCES, name), 'utf8');
        for (const field of missingFields(source)) failures.push(`${name}: no **${field}:** field`);
        for (const key of backedKeys(source, keys)) deciders.set(key, [...(deciders.get(key) ?? []), name]);
    }
    const judged = sections.filter(section => section.level !== 'Failures');
    console.log(`Judged sections: ${judged.length}. With a heuristic: ${judged.filter(section => deciders.has(section.key)).length}.\n`);
    for (const section of judged) {
        console.log(`  ${section.key.padEnd(14)} ${(deciders.get(section.key) ?? ['none yet']).join(', ').padEnd(28)} ${section.level} — ${section.heading}`);
    }
    if (failures.length) console.log(`\nFailures (${failures.length}):\n${failures.map(line => `  ${line}`).join('\n')}`);
    return failures.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main();
