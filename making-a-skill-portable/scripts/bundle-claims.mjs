#!/usr/bin/env node
/**
 * Copies every ledger claim that a skill cites into the skill's own
 * references/evidence.md, with its grade, boundary and sources, so the
 * citations still resolve in a repository that has no ledger.
 *
 *   node bundle-claims.mjs <skill dir> <ledger dir>          write evidence.md
 *   node bundle-claims.mjs <skill dir> <ledger dir> --check  exit 1 if a cited claim is missing from it
 *
 * A claim id is `<ledger file name>-<number>`, as in software_testing-97 from
 * software_testing.md. The ledger's Questions column keys this repository's
 * quiz banks, so it is not copied.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EVIDENCE = join('references', 'evidence.md');

const filesUnder = dir => readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : filesUnder(path);
    return /\.(md|mjs|js|ts)$/.test(name) ? [path] : [];
});

/**
 * Each claim id cited in the skill, outside evidence.md, in first-seen order.
 * Prose shortens a second id in one line: "software_testing-121 and -122", or
 * "(-83)". A short `-<number>` after a space or `(` takes the area of the last
 * full id on its line.
 */
export function citedIds(texts, areas) {
    const pattern = new RegExp(`\\b(${areas.join('|')})-(\\d+)\\b|(?<=[\\s(])-(\\d+)\\b`, 'g');
    const ids = [];
    for (const line of texts.flatMap(text => text.split('\n'))) {
        let area = null;
        for (const [, full, number, short] of line.matchAll(pattern)) {
            if (full) area = full;
            if (area) ids.push(`${area}-${number ?? short}`);
        }
    }
    return [...new Set(ids)];
}

/** The ledger row for `id`, as { id, claim, grade, boundary, sources: [numbers] }. */
export function rowFor(ledger, id) {
    const line = ledger.split('\n').find(row => row.startsWith(`| ${id} |`));
    if (!line) return null;
    const [, , claim, grade, boundary, sources] = line.split('|').map(cell => cell.trim());
    return { id, claim, grade, boundary, sources: [...sources.matchAll(/\[(\d+)\]/g)].map(match => Number(match[1])) };
}

/** The numbered entries under the ledger's `## Sources` heading, by number. */
export function sourcesIn(ledger) {
    const section = ledger.split(/^## Sources\s*$/m)[1]?.split(/^## /m)[0] ?? '';
    return new Map([...section.matchAll(/^(\d+)\. (.+)$/gm)].map(match => [Number(match[1]), match[2].trim()]));
}

export function evidenceFor(rows, sources) {
    const blocks = rows.map(row => [
        `### ${row.id} (${row.grade})`,
        '',
        row.claim,
        '',
        `**Boundary:** ${row.boundary}`,
        '',
        '**Sources:**',
        '',
        ...row.sources.map(number => `- ${sources.get(row.id.replace(/-\d+$/, '')).get(number) ?? `[${number}] not found`}`),
    ].join('\n'));
    return [
        '# Evidence',
        '',
        'Each graded claim that this skill cites, copied from the ledger where it',
        'was researched. A grade is strong, moderate, weak, unsupported or',
        'folklore. The boundary says where the claim stops holding.',
        '',
        ...blocks.flatMap(block => [block, '']),
    ].join('\n');
}

export function main([skillDir, ledgerDir, flag]) {
    const areas = readdirSync(ledgerDir).filter(name => name.endsWith('.md') && name !== 'README.md').map(name => basename(name, '.md'));
    const texts = filesUnder(skillDir).filter(path => !path.endsWith(EVIDENCE)).map(path => readFileSync(path, 'utf8'));
    const ids = citedIds(texts, areas);

    if (flag === '--check') {
        const evidencePath = join(skillDir, EVIDENCE);
        const evidence = existsSync(evidencePath) ? readFileSync(evidencePath, 'utf8') : '';
        const missing = ids.filter(id => !evidence.includes(`### ${id} (`));
        console.log(`Cited claims: ${ids.length}. Missing from ${EVIDENCE}: ${missing.length}.`);
        for (const id of missing) console.log(`  ${id}`);
        return missing.length ? 1 : 0;
    }

    const ledgers = new Map();
    const ledgerFor = area => ledgers.get(area) ?? ledgers.set(area, readFileSync(join(ledgerDir, `${area}.md`), 'utf8')).get(area);
    const rows = ids.map(id => rowFor(ledgerFor(id.replace(/-\d+$/, '')), id));
    const unknown = ids.filter((id, index) => !rows[index]);
    if (unknown.length) {
        console.log(`No ledger row for: ${unknown.join(', ')}`);
        return 1;
    }
    const sorted = rows.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
    const sources = new Map([...new Set(sorted.map(row => row.id.replace(/-\d+$/, '')))].map(area => [area, sourcesIn(ledgerFor(area))]));
    writeFileSync(join(skillDir, EVIDENCE), evidenceFor(sorted, sources));
    console.log(`Wrote ${sorted.length} claims to ${join(skillDir, EVIDENCE)}.`);
    return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
