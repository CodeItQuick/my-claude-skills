#!/usr/bin/env node
/**
 * Counts the ties between a skill and the repository it came from.
 *
 *   node scan-ties.mjs <skill dir> <repo root> [--with <skill>]...
 *
 * The patterns come from the repository itself: its top-level folders and
 * Markdown files, and the names of the skills in its .claude/skills/. A skill
 * named with --with travels with this one, so naming it is not a tie.
 * Exit 1 if any tie is found.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const either = names => names.map(escape).join('|');
const listed = dir => { try { return readdirSync(dir, { withFileTypes: true }); } catch { return []; } };

/** The tie patterns for one repository. A category with no names gets no pattern. */
export function tiePatterns({ folders, docs, skills }) {
    const patterns = {
        ticket: /\b[A-Z][A-Z0-9]+-\d+\b/g,
        commit: /`[0-9a-f]{7,12}\^?`/g,
        date: /\b20\d\d-\d\d-\d\d\b/g,
    };
    if (folders.length) patterns['repo path'] = new RegExp(`(?<![\\w./$-])(?:${either(folders)})/[\\w./-]+`, 'g');
    if (docs.length) patterns['repo doc'] = new RegExp(`(?<![\\w/-])(?:${either(docs)})\\b`, 'g');
    if (skills.length) patterns['repo skill'] = new RegExp(`(?<![\\w/-])(?:${either(skills)})(?![\\w-])`, 'g');
    return patterns;
}

/**
 * The prose of a file: all of a Markdown file, and only the comments of a
 * script. A date or a path in test data is an input, not a tie.
 */
export function proseOf(path, text) {
    if (path.endsWith('.md')) return text;
    // ponytail: a `//` inside a string counts as a comment; a real tokenizer if that ever matters.
    return text.split('\n').map(line => {
        const trimmed = line.trim();
        if (/^(?:\/\*|\*)/.test(trimmed)) return line;
        const at = line.indexOf('//');
        return at === -1 ? '' : line.slice(at);
    }).join('\n');
}

export function tiesIn(text, patterns) {
    return Object.entries(patterns).flatMap(([category, pattern]) =>
        [...text.matchAll(pattern)].map(match => ({ category, text: match[0], line: text.slice(0, match.index).split('\n').length })));
}

function repositoryNames(root, skillDir, travelling) {
    const own = basename(resolve(skillDir));
    const entries = listed(root);
    // `scripts/` in the skill names the skill's own folder, not the repository's.
    const ownFolders = listed(skillDir).map(entry => entry.name);
    return {
        folders: entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && !ownFolders.includes(entry.name)).map(entry => entry.name),
        docs: entries.filter(entry => entry.isFile() && entry.name.endsWith('.md')).map(entry => entry.name),
        // ponytail: a one-word skill name such as `break` reads as a plain word, so only hyphenated names count.
        skills: listed(join(root, '.claude', 'skills')).map(entry => entry.name).filter(name => name.includes('-') && name !== own && !travelling.includes(name)),
    };
}

const filesUnder = dir => readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : filesUnder(path);
    return /\.(md|mjs|js|cjs|ts)$/.test(name) ? [path] : [];
});

export function main(args) {
    const [skillDir, root] = args;
    const travelling = args.flatMap((arg, index) => arg === '--with' ? [args[index + 1]] : []);
    const patterns = tiePatterns(repositoryNames(root, skillDir, travelling));
    let total = 0;
    for (const path of filesUnder(skillDir)) {
        const ties = tiesIn(proseOf(path, readFileSync(path, 'utf8')), patterns);
        for (const tie of ties) console.log(`${relative(skillDir, path).replace(/\\/g, '/')}:${tie.line}: ${tie.category}: ${tie.text}`);
        total += ties.length;
    }
    console.log(`Ties: ${total}.`);
    return total ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
