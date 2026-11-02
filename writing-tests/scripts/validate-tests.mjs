#!/usr/bin/env node
// Finds control flow that changes what a test asserts.
//
//   node validate-tests.mjs [path ...]     # defaults to every test dir
//
// Errors: branching or looping inside a test body. Such a test asserts
// different things on different runs, so a pass means "one of several things
// held" and a failure does not say which. Also: one helper body copied into
// two spec files, under any name. Also, inside a test body: ambient state, a
// fixed sleep, no assertion, a comparison folded into a boolean, one test
// body written twice, and a fake, spy or stub that no after-hook restores,
// including one set up in a helper that the spec imports from a relative path,
// statically or with `await import()`.
//
// Warnings: the same inside a module-level helper in a test file. Legal, and
// how a conditional assertion usually escapes an error — it moves one function
// out. Read each one and ask whether it drives the app or decides an assertion.
// Also: control flow in a before or after hook, ambient state or a fixed sleep
// in a helper, one helper name with different bodies, and weak assertions.
//
// Never flagged: control flow in a `describe` body outside any test. That is
// parameterisation — one test per case, each still straight-line.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

/** A project lists its test roots here. Without it, the validator reads the working directory. */
const CONFIG = join('.claude', 'writing-tests', 'config.json');
/** Folders that hold built or installed code. A folder whose name starts with `.` is skipped too. */
const SKIPPED = new Set(['node_modules', 'dist', 'build', 'coverage']);
const TEST_FILE = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/;

const BRANCHES = [
    { pattern: /\bif\s*\(/g, name: 'if' },
    { pattern: /\belse\b/g, name: 'else' },
    { pattern: /\bswitch\s*\(/g, name: 'switch' },
    { pattern: /\btry\s*\{/g, name: 'try/catch' },
    { pattern: /\s\?\s[^:]*\s:\s/g, name: 'ternary' },
    { pattern: /\|\|/g, name: '|| fallback' },
    { pattern: /\?\?(?!=)/g, name: '?? fallback' },
];

const LOOPS = [
    { pattern: /\bfor\s*\(/g, name: 'for' },
    { pattern: /\bwhile\s*\(/g, name: 'while' },
    { pattern: /\.forEach\s*\(/g, name: 'forEach' },
];

/**
 * Asserts that pass for almost any value. Each one is legal where "it exists"
 * is the whole contract, and weak where the test knows the exact value
 * (software_testing-100: written asserts observe less state than they can).
 * Reported, never failed: only a reader can tell which of the two it is.
 */
const WEAK_ASSERTIONS = [
    { pattern: /\.toBeDefined\(\)/g, name: 'toBeDefined()' },
    { pattern: /\.toBeTruthy\(\)/g, name: 'toBeTruthy()' },
    { pattern: /\.toBeFalsy\(\)/g, name: 'toBeFalsy()' },
    { pattern: /\bexpect\(\s*typeof\b/g, name: 'expect(typeof …)' },
    { pattern: /\.length\)\s*\.toBeGreaterThan\(\s*0\s*\)/g, name: 'length > 0' },
    { pattern: /\.to\.(?:be\.)?(?:ok|exist)\b/g, name: 'chai ok/exist' },
    { pattern: /\.not\.toBe(?:Null|Undefined)\(\)/g, name: 'not.toBeNull()/not.toBeUndefined()' },
    { pattern: /(?<!\.length\)\s*)\.toBe(?:GreaterThan|LessThan)(?:OrEqual)?\(\s*0\s*\)/g, name: 'sign-only check against 0' },
    // chai `assert` and `node:assert`, under any name that ends in `assert` or `Assert`.
    // An argument that compares is a folded comparison, a failure, so it is not also weak.
    { pattern: /\b\w*[Aa]ssert\s*\.\s*(?:isOk|exists|isDefined|isNotNull|isNotUndefined|ok)\s*\((?![^()]*(?:===?|!==?|<=?|>=?))/g, name: 'assert ok/exists' },
    { pattern: /\b\w*[Aa]ssert\s*\.\s*(?:isArray|isObject|isString|isNumber|isBoolean|isFunction|typeOf)\s*\(/g, name: 'assert type check' },
];

/**
 * Inputs the test does not control (software_testing-83, strong; -101). The
 * file is exempt when it controls the input: fake timers for the clock, a spy
 * on `Math.random` for the draw.
 */
const AMBIENT = [
    { pattern: /\bDate\.now\s*\(/g, name: 'Date.now()', exempt: 'clock' },
    { pattern: /\bnew\s+Date\s*\(\s*\)/g, name: 'new Date()', exempt: 'clock' },
    { pattern: /\bMath\.random\s*\(/g, name: 'Math.random()', exempt: 'random' },
];
const CONTROLS = {
    clock: /\b(?:useFakeTimers|setSystemTime)\b|\bclock\s*\.\s*(?:install|setFixedTime|setSystemTime)\b/,
    random: /\bspyOn\s*\(\s*Math\s*,|\bMath\.random\s*=[^=]/,
};

/**
 * A wait for a fixed time, the async-wait cause of flakiness
 * (software_testing-14, strong). `setTimeout` under fake timers is not a wait.
 */
const SLEEPS = [
    { pattern: /\.waitForTimeout\s*\(/g, name: 'waitForTimeout()' },
    { pattern: /\bsetTimeout\s*\(/g, name: 'setTimeout()', exempt: 'clock' },
];

/**
 * A fake, spy or stub that outlives its test makes the next test depend on
 * order (software_testing-15, strong) and on state it does not control (-83).
 * The restore counts only inside an `afterEach` or `afterAll`: at the end of a
 * test body it is skipped when an earlier assertion fails. An assignment to
 * `Math.random` controls the draw, and it leaks as a stub does until an
 * after-hook assigns the original back. Jest's `replaceProperty` and every
 * sinon fake return a handle with `restore()`, and `sinon.restore()` puts back
 * all of the default sandbox's fakes, so Mocha files are read the same way.
 */
const LEAKS = [
    { setup: /\b(?:vi|jest)\.useFakeTimers\s*\(/g, restore: /\b(?:vi|jest)\.useRealTimers\s*\(/, name: 'useFakeTimers()', needs: 'useRealTimers()' },
    { setup: /\b(?:vi|jest)\.spyOn\s*\(/g, restore: /\b(?:vi|jest)\.restoreAllMocks\s*\(|\.mockRestore\s*\(/, name: 'spyOn()', needs: 'restoreAllMocks() or mockRestore()' },
    { setup: /\bjest\.replaceProperty\s*\(/g, restore: /\bjest\.restoreAllMocks\s*\(|\.restore\s*\(/, name: 'replaceProperty()', needs: 'restoreAllMocks() or restore()' },
    { setup: /\bsinon\.useFakeTimers\s*\(/g, restore: /\.restore\s*\(/, name: 'sinon.useFakeTimers()', needs: 'clock.restore() or sinon.restore()' },
    { setup: /\bsinon\.(?:stub|spy|replace)\s*\(/g, restore: /\.restore\s*\(/, name: 'sinon.stub(), spy() or replace()', needs: 'restore() or sinon.restore()' },
    { setup: /\bvi\.stubGlobal\s*\(/g, restore: /\bvi\.unstubAllGlobals\s*\(/, name: 'stubGlobal()', needs: 'unstubAllGlobals()' },
    { setup: /\bvi\.stubEnv\s*\(/g, restore: /\bvi\.unstubAllEnvs\s*\(/, name: 'stubEnv()', needs: 'unstubAllEnvs()' },
    { setup: /\bMath\.random\s*=(?!=)/g, restore: /\bMath\.random\s*=(?!=)/, name: 'Math.random = …', needs: 'Math.random = original' },
];
/** Mocha names its after-hooks `after` and `afterEach`. A method call such as `context.after(` is not one. */
const AFTER_HOOK = '(?<!\\.)\\b(?:after|afterEach|afterAll)\\s*\\(';
const callOf = name => new RegExp(`(?<![.\\w$])${name}\\s*\\(`, 'g');

/** An `if` whose whole statement is one `delete`: an after-hook putting back a value that was unset. */
const RESTORING_DELETE = /^if\s*\([^()]*\)\s*(?:delete\b[^;{}\n]*|\{\s*delete\b[^;{}]*;?\s*\})/;

/** Any call that asserts: `expect`, `assert`, chai `should`, a helper named for one, or `node:assert` imported as `nodeAssert`. */
const ASSERTS = /\b(?:expect|assert)\w*\s*[.(]|\b\w+Assert\s*[.(]|\.should\b/;

/**
 * Blanks comments and string bodies so keywords inside them do not match.
 * One pass, left to right: whichever starts first wins, so the `//` in
 * `'https://…'` stays inside its string instead of opening a comment.
 */
export function blankNoise(source) {
    return source.replace(
        /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g,
        match => match.replace(/[^\n]/g, ' '),
    );
}

/**
 * The span of the body that starts after `from`.
 *
 * `from` must already be past the parameter list. A TypeScript parameter can
 * carry an object type — `(ordered: ReadonlyArray<{ factor: string }>)` — and
 * taking the first `{` after the function name lands inside that annotation
 * instead of the body, which silently exempts the whole helper.
 */
function bodyAfter(source, from) {
    const open = source.indexOf('{', from);
    if (open === -1) return null;

    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}' && --depth === 0) return { start: open, end: i };
    }
    return null;
}

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

/** Index just past the parameter list whose `(` is at or after `from`. */
function afterParams(source, from) {
    const open = source.indexOf('(', from);
    if (open === -1) return from;

    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === '(') depth++;
        else if (source[i] === ')' && --depth === 0) return i + 1;
    }
    return from;
}

/**
 * An expression-bodied arrow has no braces, so its span runs to the end of the
 * statement. Falling through to the next `{` in the file would invent a span
 * covering unrelated code — and a bogus helper span that swallowed a test would
 * hide real failures rather than report them.
 */
function expressionSpan(source, from) {
    const end = source.indexOf(';', from);
    return { start: from, end: end === -1 ? source.length : end };
}

function findAll(source, starter, { skipParams = false, arrowBody = false } = {}) {
    const spans = [];
    const pattern = new RegExp(starter, 'g');

    for (const match of source.matchAll(pattern)) {
        const from = skipParams ? afterParams(source, match.index) : match.index + match[0].length;
        const nextBrace = source.slice(from).match(/^[\s=>]*\{/);
        const body = arrowBody && !nextBrace ? expressionSpan(source, from) : bodyAfter(source, from);
        if (body) spans.push({ ...body, line: lineOf(source, match.index) });
    }
    return spans;
}

/**
 * The body of the callback in each test call matching `starter`: the brace
 * after the first `=>` or after the parameters of the first `function`, inside
 * the call's own parentheses. A call with no callback there, such as
 * `test.skip(condition, 'reason')` inside a test, is not a test. An arrow with
 * no brace is an expression body, which runs to the end of the call.
 */
function testBodies(source, starter) {
    const spans = [];
    for (const match of source.matchAll(new RegExp(starter, 'g'))) {
        const close = closingParen(source, match.index + match[0].length - 1);
        if (close === -1) continue;
        const call = source.slice(match.index, close);
        const arrow = call.search(/=>/);
        const fn = call.search(/\bfunction\b/);
        if (arrow === -1 && fn === -1) continue;

        const viaFunction = fn !== -1 && (arrow === -1 || fn < arrow);
        const from = viaFunction ? afterParams(source, match.index + fn) : match.index + arrow + 2;
        const braced = viaFunction || /^\s*\{/.test(source.slice(from));
        const body = braced ? bodyAfter(source, from) : { start: from, end: close };
        if (body) spans.push({ ...body, line: lineOf(source, match.index) });
    }
    return spans;
}

/** Control-flow hits inside a span, excluding any nested test bodies. */
function hitsIn(source, span, nested) {
    const found = [];

    for (const { pattern, name } of [...BRANCHES, ...LOOPS]) {
        for (const match of source.slice(span.start, span.end).matchAll(pattern)) {
            const at = span.start + match.index;
            if (nested.some(inner => at > inner.start && at < inner.end)) continue;
            found.push({ name, at, line: lineOf(source, at) });
        }
    }
    return found.sort((a, b) => a.line - b.line);
}

/** Index of the `)` that closes the `(` at `open`, or -1. */
function closingParen(source, open) {
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === '(') depth++;
        else if (source[i] === ')' && --depth === 0) return i;
    }
    return -1;
}

/** The text of `argument` at bracket depth zero, up to its first top-level comma. */
function topLevel(argument) {
    let depth = 0;
    let out = '';
    for (const char of argument) {
        if ('([{'.includes(char)) depth++;
        else if (')]}'.includes(char)) depth--;
        else if (depth === 0 && char === ',') break;
        else if (depth === 0) out += char;
    }
    return out;
}

const COMPARISON = /===?|!==?|<=?|>=?/;
// Vitest, then chai: `.to.eq(true)`, `.to.equal(false)`, `.to.be.true`. A chai
// suite asserts only in the second form, so the Vitest half alone misses it.
const BOOLEAN_MATCHER = /^\s*\.\s*(?:not\s*\.\s*)?(?:(?:toBe|toEqual|toStrictEqual)\s*\(\s*(?:true|false)\s*\)|(?:toBeTruthy|toBeFalsy)\s*\(\s*\))|^\s*\.\s*to\s*\.\s*(?:not\s*\.\s*)?(?:(?:be\s*\.\s*)?(?:eq|equal|equals|eql)\s*\(\s*(?:true|false)\s*\)|be\s*\.\s*(?:true|false)\b)/;

/** The arguments in `text`, split at each comma at bracket depth zero. */
function argumentsOf(text) {
    const parts = [''];
    let depth = 0;
    for (const char of text) {
        if ('([{'.includes(char)) depth++;
        else if (')]}'.includes(char)) depth--;
        if (depth === 0 && char === ',') parts.push('');
        else parts[parts.length - 1] += char;
    }
    return parts;
}

/** `expect(`, and chai or `node:assert` under any name that ends in `assert` or `Assert`. */
const ASSERT_CALL = /\b(expect|\w*[Aa]ssert(?:\s*\.\s*(?:ok|isOk|isNotOk|isTrue|isFalse|equal|strictEqual|deepEqual|deepStrictEqual))?)\s*\(/g;

/**
 * Each assert whose subject is a boolean: `expect(…)` with a boolean matcher,
 * `assert(…)`, `ok`, `isTrue` or `isFalse`, and an `equal` against `true` or
 * `false`. Each one gives its callee, its `(` and its arguments.
 */
function booleanAsserts(source, span) {
    const found = [];
    for (const match of source.slice(span.start, span.end).matchAll(ASSERT_CALL)) {
        const callee = match[1].replace(/\s+/g, '');
        const open = span.start + match.index + match[0].length - 1;
        const close = closingParen(source, open);
        if (close === -1) continue;
        const args = source.slice(open + 1, close);
        const boolean = callee === 'expect' ? BOOLEAN_MATCHER.test(source.slice(close + 1))
            : /[Ee]qual$/.test(callee) ? /^\s*(?:true|false)\s*$/.test(argumentsOf(args)[1] ?? '')
            : true;
        if (boolean) found.push({ callee, open, args });
    }
    return found;
}

/**
 * `expect(a === b).toBe(true)` and `assert(a === b)`: the comparison runs
 * before the matcher sees it, so a failure reports `false` and hides both
 * values (software_testing-100: an assert observes less state than it can).
 */
function foldedComparisons(source, span) {
    return booleanAsserts(source, span)
        .filter(({ args }) => COMPARISON.test(topLevel(args).replace(/=>/g, '')))
        .map(({ open }) => lineOf(source, open));
}

/**
 * The first argument with each bracketed group emptied: `a.every(x => x.b)`
 * becomes `a.every()`. A comma at depth zero ends it, so a trailing comma or a
 * message argument is dropped.
 */
function withoutNested(argument) {
    let depth = 0;
    let out = '';
    for (const char of argument) {
        if ('([{'.includes(char)) { if (depth++ === 0) out += char; }
        else if (')]}'.includes(char)) { if (--depth === 0) out += char; }
        else if (depth === 0 && char === ',') break;
        else if (depth === 0) out += char;
    }
    return out.trim();
}

const COLLAPSING_CALL = /^!?(?:[\w$.\s]|\(\)|\[\])*\.\s*(every|some|has|includes|startsWith|endsWith)\s*\(\)$|^(Array\s*\.\s*isArray)\s*\(\)$/;

/**
 * `expect(items.every(…)).toBe(true)`: the call collapses the value into a
 * boolean before the matcher sees it, so a failure reports `false` and hides
 * which element broke it (software_testing-100). A call over several lines
 * counts. Returns the line, the assert and the name of each call.
 */
function collapsedBooleans(source, span) {
    return booleanAsserts(source, span).flatMap(({ callee, open, args }) => {
        const call = withoutNested(args).match(COLLAPSING_CALL);
        return call ? [{ line: lineOf(source, open), callee, name: call[1] ? `x.${call[1]}` : 'Array.isArray' }] : [];
    });
}

/**
 * A name a spec imports from the code under test: a relative path that does
 * not go through `support/`. Static imports, `require` and `await import()`
 * alike. Only SCREAMING_CASE names count. Those are values, while a camelCase
 * import is an object that a `toBe` can check by identity.
 */
const PRODUCTION_IMPORT = /\bimport\s+(?:type\s+)?(?:\w+\s*,\s*)?\{([^}]*)\}\s*from\s*['"](\.{1,2}\/[^'"]+)['"]|\b(?:const|let|var)\s+\{([^{}]*)\}\s*=\s*(?:await\s+import|require)\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
const SCREAMING = /^[A-Z][A-Z0-9_]+$/;

function productionValues(source, clean) {
    const values = new Map();
    // Read the raw source: blanking empties the path string.
    for (const match of source.matchAll(PRODUCTION_IMPORT)) {
        if (clean[match.index] === ' ') continue;
        const [bindings, specifier] = match[1] === undefined ? [match[3], match[4]] : [match[1], match[2]];
        if (/(?:^|\/)support(?:\/|$)/.test(specifier)) continue;
        for (const binding of bindings.split(',').map(text => text.replace(/^type\s+/, '').trim()).filter(Boolean)) {
            const [name, local = name] = binding.split(/\s+as\s+|\s*:\s*/);
            if (SCREAMING.test(local)) values.set(local, specifier);
        }
    }
    return values;
}

/** A module-level `const` that holds only a number, string, boolean or null literal. */
const LITERAL_CONST = /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*(?:-?\d[\d_.]*(?:e-?\d+)?|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|true|false|null)\s*;?[ \t\r]*$/gm;

function literalConsts(source, clean) {
    return new Set([...source.matchAll(LITERAL_CONST)]
        .filter(match => clean[match.index] !== ' ')
        .map(match => match[1]));
}

/** The matchers whose argument is the expected value, Vitest and chai alike. Not `assert.equal(`, below. */
const EXPECTED_ARGUMENT = /(?<!\b\w*[Aa]ssert\s*)\.\s*(?:toBe|toEqual|toStrictEqual|toMatchObject|toHaveLength|toContain|toContainEqual|eq|equal|equals|eql)\s*\(/g;
/** chai `assert` and `node:assert` take the expected value as the second argument. */
const ASSERT_EXPECTED = /\b\w*[Aa]ssert\s*\.\s*(?:equal|strictEqual|deepEqual|deepStrictEqual|lengthOf)\s*\(/g;
/** A bare name, or a property or index read off one: `LIMIT`, `LABELS.patience`, `LABELS['patience']`. */
const NAME_READ = /^\s*([A-Za-z_$][\w$]*)(?:\s*\.\s*[\w$]+|\s*\[\s*\])*\s*$/;

/**
 * Each expected value in `span` that is a name, not a literal. One imported
 * from the code under test passes when that constant is wrong, since the code
 * and the test read the same value. One bound to a local literal only hides
 * the value from the reader. A name passed as an input, or an object that the
 * test built and reads back, is not an expected value here and is not read.
 * An expected value built with arithmetic over a name is a warning: a copied
 * formula passes when it and the code are wrong in the same way, and a delta
 * between two reads is fine. Only a reader can tell the two apart.
 */
function namedExpectations(source, clean, span, imported, literals) {
    const found = { imported: [], named: [], computed: [] };
    const body = clean.slice(span.start, span.end);
    const calls = [
        ...[...body.matchAll(EXPECTED_ARGUMENT)].map(match => ({ match, position: 0 })),
        ...[...body.matchAll(ASSERT_EXPECTED)].map(match => ({ match, position: 1 })),
    ];
    for (const { match, position } of calls) {
        const open = span.start + match.index + match[0].length - 1;
        const close = closingParen(clean, open);
        if (close === -1) continue;
        const expected = argumentsOf(clean.slice(open + 1, close))[position] ?? '';
        // Keep the brackets, so that a call such as `Math.round(…)` is not read as a name.
        const name = withoutNested(expected).match(NAME_READ)?.[1];
        const line = lineOf(clean, open);
        if (imported.has(name)) found.imported.push({ line, name, from: imported.get(name) });
        else if (literals.has(name)) found.named.push({ line, name });
        else if (!name && ARITHMETIC.test(expected)) found.computed.push({ line, expression: expected.replace(/\s+/g, ' ').trim() });
    }
    return found;
}

/** An operator with a name on one side: `amount * 1.08`, `5 * multiplier`, `first.remaining - 10`. Not `-1` or `1e-3`. */
const ARITHMETIC = /(?<![\w$.])[A-Za-z_$][\w$.]*\s*[-+*/%]\s*[\w$(.]|[\w$).]\s*[-+*/%]\s*(?:\(\s*)*[A-Za-z_$]/;

/**
 * Whitespace reduced to what changes the meaning: a space between two words
 * stays one space, and a space next to punctuation goes. A string literal
 * keeps its punctuation and has its whitespace collapsed. Known ceiling: `a + +b`
 * and `a++b` compare equal, and no real pair of tests differs by that.
 */
const squeezed = text => text
    .replace(/('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\s*([^\w\s$'"`])\s*|\s+/g,
        (match, literal, punctuation) => literal?.replace(/\s+/g, ' ') ?? punctuation ?? ' ')
    .trim();

/** A test body with comments dropped and spacing squeezed; literals kept. */
const normalisedBody = (source, span) => squeezed(blankComments(source.slice(span.start, span.end + 1)));

/** Each exported function or const of a module, by name: its blanked text and the after-hooks inside it. */
function exportedHelpers(clean) {
    const found = new Map();
    const add = (name, body) => found.set(name, { body, hooks: testBodies(body, AFTER_HOOK).map(hook => body.slice(hook.start, hook.end)) });
    for (const match of clean.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm)) {
        const span = bodyAfter(clean, afterParams(clean, match.index));
        if (span) add(match[1], clean.slice(span.start, span.end));
    }
    for (const match of clean.matchAll(/^export\s+const\s+(\w+)\s*(?::[^=\n]+)?=/gm)) {
        const from = match.index + match[0].length;
        add(match[1], clean.slice(from, statementEnd(clean, from)));
    }
    return found;
}

/**
 * The helpers that the spec imports by name from a relative path, read one
 * level deep: a helper's own imports are not followed. A static
 * `import { x } from '…'` and a `const { x } = await import('…')` count alike.
 */
const IMPORT_FROM = /\bimport\s*\{([^}]*)\}\s*from\s*['"](\.{1,2}\/[^'"]+)['"]|\{([^{}]*)\}\s*=\s*await\s+import\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;

function importedHelpers(source, clean, readImport) {
    const helpers = [];
    // Read the raw source: blanking empties the path string.
    for (const match of source.matchAll(IMPORT_FROM)) {
        if (clean[match.index] === ' ') continue;
        const [bindings, specifier] = match[1] === undefined ? [match[3], match[4]] : [match[1], match[2]];
        const module = readImport(specifier);
        if (module === null) continue;
        const exported = exportedHelpers(blankNoise(module));
        for (const binding of bindings.split(',').map(text => text.trim()).filter(Boolean)) {
            const [name, local = name] = binding.split(/\s+as\s+|\s*:\s*/);
            if (exported.has(name)) helpers.push({ local, from: specifier, ...exported.get(name) });
        }
    }
    return helpers;
}

export function checkFile(path, source, readImport = () => null) {
    const clean = blankNoise(source);
    const failures = [];
    const warnings = [];
    const weak = [];
    const ambient = [];
    const sleeps = [];
    const unasserted = [];
    const folded = [];
    const bodies = [];
    const leaks = [];
    const helperAmbient = [];
    const helperSleeps = [];
    const importedExpected = [];
    const namedLiterals = [];
    const computedExpected = [];
    const productionNames = productionValues(source, clean);
    const localLiterals = literalConsts(source, clean);
    const controlled = kind => kind && CONTROLS[kind].test(clean);
    /** Each AMBIENT or SLEEPS hit in `span` that the file does not control. */
    const uncontrolledIn = (span, checks) => checks.flatMap(({ pattern, name, exempt }) => {
        if (controlled(exempt)) return [];
        // Confirmed on the raw source: blanking turns `new Date('1999-12-31')` into `new Date(   )`.
        const raw = new RegExp(pattern.source, 'y');
        return [...clean.slice(span.start, span.end).matchAll(pattern)]
            .map(match => span.start + match.index)
            .filter(at => {
                raw.lastIndex = at;
                return raw.test(source);
            })
            .map(at => ({ name, line: lineOf(clean, at) }));
    });

    // `it(` and `test(`, but not `test.describe(` — a describe is a container.
    // The body follows the callback's `=>` or its parameter list. The first `{`
    // after `test(` is the wrong one: in `async ({ page }) => {` it is the
    // destructured parameter, which hides every Playwright body.
    // Not `.test(`, which is a regex call such as `/^Maps/.test(description)`.
    const tests = testBodies(clean, '(?<!\\.)\\b(?:it|test)(?:\\.(?:only|skip|fixme))?\\s*\\(');
    // Both helper shapes, and an optional type annotation before the `=`.
    // Without arrow consts, moving a ternary into `const choose = q => ...`
    // hides it from this report entirely rather than demoting it to a warning;
    // without the annotation, `const choose: Strategy = q => ...` does the same.
    const ASSIGNED = '\\b(?:const|let)\\s+\\w+\\s*(?::[^=\\n]+)?=\\s*(?:async\\s*)?';
    const helpers = [
        ...findAll(clean, '\\b(?:async\\s+)?function\\s+\\w+\\s*', { skipParams: true }),
        ...findAll(clean, `${ASSIGNED}(?=\\()`, { skipParams: true, arrowBody: true }),
        ...findAll(clean, `${ASSIGNED}\\w+\\s*=>`, { arrowBody: true }),
    ];

    for (const span of tests) {
        for (const hit of hitsIn(clean, span, [])) {
            failures.push(`${path}:${hit.line}: ${hit.name} inside a test body (test starts line ${span.line})`);
        }
        const body = clean.slice(span.start, span.end);
        for (const { pattern, name } of WEAK_ASSERTIONS) {
            for (const match of body.matchAll(pattern)) {
                weak.push(`${path}:${lineOf(clean, span.start + match.index)}: ${name}`);
            }
        }
        for (const { line, callee, name } of collapsedBooleans(clean, span)) {
            weak.push(`${path}:${line}: ${callee}(${name}(…)) collapses to a boolean; compare the value with a matcher so a failure shows it`);
        }
        for (const { name, line } of uncontrolledIn(span, AMBIENT)) ambient.push(`${path}:${line}: ${name} inside a test body, and the file does not control it`);
        for (const { name, line } of uncontrolledIn(span, SLEEPS)) sleeps.push(`${path}:${line}: ${name} inside a test body`);
        if (!ASSERTS.test(body)) unasserted.push(`${path}:${span.line}: test has no assertion`);
        for (const line of foldedComparisons(clean, span)) {
            folded.push(`${path}:${line}: comparison inside the assertion; compare with a matcher so a failure shows both values`);
        }
        const expectations = namedExpectations(source, clean, span, productionNames, localLiterals);
        for (const { line, name, from } of expectations.imported) {
            importedExpected.push(`${path}:${line}: ${name} is imported from ${from}, the code under test; write the expected value as a literal`);
        }
        for (const { line, name } of expectations.named) {
            namedLiterals.push(`${path}:${line}: ${name} names a literal; write the literal as the expected value`);
        }
        for (const { line, expression } of expectations.computed) {
            computedExpected.push(`${path}:${line}: the expected value is computed (${expression}); write the literal that it gives, unless it relates two values that the test read`);
        }
        bodies.push({ at: `${path}:${span.line}`, body: normalisedBody(source, span) });
    }

    const hooks = testBodies(clean, AFTER_HOOK).map(hook => clean.slice(hook.start, hook.end));
    const imported = importedHelpers(source, clean, readImport);
    const called = (text, helper) => callOf(helper.local).test(text);
    const passedAsHook = helper => new RegExp(`${AFTER_HOOK}\\s*${helper.local}\\s*\\)`).test(clean);
    // A support helper restores when the spec calls it inside an after-hook or
    // passes it as one, or when the helper registers its own after-hook and
    // the spec calls it.
    const restorers = [
        ...hooks,
        ...imported.filter(helper => passedAsHook(helper) || hooks.some(hook => called(hook, helper))).map(helper => helper.body),
        ...imported.filter(helper => called(clean, helper)).flatMap(helper => helper.hooks),
    ];
    for (const { setup, restore, name, needs } of LEAKS) {
        if (restorers.some(text => restore.test(text))) continue;
        for (const match of clean.matchAll(setup)) {
            leaks.push(`${path}:${lineOf(clean, match.index)}: ${name} with no ${needs} in an afterEach or afterAll`);
        }
        for (const helper of imported.filter(helper => helper.body.search(setup) !== -1)) {
            for (const match of clean.matchAll(callOf(helper.local))) {
                leaks.push(`${path}:${lineOf(clean, match.index)}: ${name} in ${helper.local}() from ${helper.from}, with no ${needs} in an afterEach or afterAll`);
            }
        }
    }

    for (const span of helpers) {
        if (tests.some(t => span.start > t.start && span.end < t.end)) continue;
        for (const hit of hitsIn(clean, span, [])) {
            warnings.push(`${path}:${hit.line}: ${hit.name} in a test-file helper (helper starts line ${span.line})`);
        }
        // `const stamp = () => Date.now()` called from a test hides the clock one function out.
        for (const { name, line } of uncontrolledIn(span, AMBIENT)) helperAmbient.push(`${path}:${line}: ${name} in a test-file helper, and the file does not control it (helper starts line ${span.line})`);
        for (const { name, line } of uncontrolledIn(span, SLEEPS)) helperSleeps.push(`${path}:${line}: ${name} in a test-file helper (helper starts line ${span.line})`);
    }

    // A hook callback is neither a test nor a named helper, so neither scan
    // above reads it. A setup that branches decides what every test runs
    // against. A hook inside a helper or a test, and a helper inside
    // the hook, are already read by those scans.
    const hookFlow = [];
    const inside = (inner, outer) => inner.start > outer.start && inner.end < outer.end;
    for (const span of testBodies(clean, '(?<!\\.)\\b(?:before|after|beforeEach|afterEach|beforeAll|afterAll)\\s*\\(')) {
        if ([...helpers, ...tests].some(outer => inside(span, outer))) continue;
        for (const hit of hitsIn(clean, span, helpers.filter(inner => inside(inner, span)))) {
            // `if (ORIGINAL === undefined) delete process.env.X` restores an unset variable. It decides nothing.
            if (RESTORING_DELETE.test(clean.slice(hit.at))) continue;
            hookFlow.push(`${path}:${hit.line}: ${hit.name} in a test-file hook (hook starts line ${span.line})`);
        }
        // A clock read or a fixed sleep in a hook runs before every test in its block.
        for (const { name, line } of uncontrolledIn(span, AMBIENT)) helperAmbient.push(`${path}:${line}: ${name} in a test-file hook, and the file does not control it (hook starts line ${span.line})`);
        for (const { name, line } of uncontrolledIn(span, SLEEPS)) helperSleeps.push(`${path}:${line}: ${name} in a test-file hook (hook starts line ${span.line})`);
    }

    return { failures, warnings, hookFlow, helperAmbient, helperSleeps, weak, namedLiterals, computedExpected, ambient, sleeps, unasserted, folded, importedExpected, bodies, leaks, ...flakeAndReadingFindings(path, source, clean, tests) };
}

/** Playwright matchers that retry until they pass, so each must be awaited. */
const WEB_FIRST = 'toBeVisible|toBeHidden|toBeEnabled|toBeDisabled|toBeChecked|toBeEditable|toBeEmpty|toBeFocused|toBeAttached|toBeInViewport|'
    + 'toHaveText|toContainText|toHaveURL|toHaveTitle|toHaveCount|toHaveValues?|toHaveAttribute|toHaveClass|toHaveCSS|toHaveId|'
    + 'toHaveJSProperty|toHaveRole|toHaveAccessibleName|toHaveAccessibleDescription|toHaveScreenshot|toPass|toBeOK';
const ASYNC_CHAIN = /^\s*(?:\.\s*not\s*)?\.\s*(?:resolves|rejects)\b/;
const WEB_FIRST_CHAIN = new RegExp(`^\\s*(?:\\.\\s*not\\s*)?\\.\\s*(?:${WEB_FIRST})\\s*\\(`);
/** A one-time read: `expect(await locator.isVisible())` checks the page once and never retries. */
const READ_METHODS = 'isVisible|isHidden|isEnabled|isDisabled|isChecked|isEditable|textContent|innerText|innerHTML|inputValue|getAttribute|count|title|evaluate|allTextContents|boundingBox';
const ONE_TIME_READ = new RegExp(`^\\s*await\\b[\\s\\S]*\\.\\s*(${READ_METHODS})\\s*\\(`);
/** `const steps = await page.evaluate(` — a one-time read stored for a later `expect(steps…)`. */
const HELD_READ = new RegExp(`\\b(?:const|let)\\s+(\\w+)\\s*=\\s*await\\b[^;]*?\\.\\s*(${READ_METHODS})\\s*\\(`, 'g');
const PLAYWRIGHT =/['"]@playwright\/test['"]/;
const FOCUSED = /\b(?:it|test|describe)(?:\s*\.\s*describe)?\s*\.\s*only\s*\(/g;
const NETWORK_CALL = /\b(?:fetch|axios(?:\s*\.\s*\w+)?|https?\s*\.\s*(?:get|request))\s*\(\s*['"`]https?:\/\//g;
const NETWORK_CONTROLLED = /stubGlobal\s*\(\s*['"]fetch|\b(?:sinon\.stub|jest\.spyOn)\s*\(\s*global(?:This)?\s*,\s*['"]fetch|\b(?:vi|jest)\.mock\s*\(|\bmsw\b|\bnock\b/;
/** A file controls `process.env` with `vi.stubEnv`, Jest's `replaceProperty`, or a sinon stub of `env`. Read from the raw source, which keeps the `'env'` string. */
const ENV_CONTROLLED = /\bstubEnv\b|\bjest\.replaceProperty\s*\(\s*process\b|\bsinon\.(?:stub|replace)\s*\(\s*process\s*,\s*['"]env['"]/g;
const OWN_MODULE_MOCK = /\b(?:vi|jest)\.mock\s*\(\s*['"`]((?:\.{1,2}\/|\/|@\/)[^'"`]*)['"`]/g;

/**
 * Over this many lines, a test body is a warning. Test size is one of the two
 * flakiness factors with a strong measured effect (software_testing-84), and
 * long tests are the flakiest (-19). Set just above the 99th percentile
 * of one measured suite of 1,144 test bodies: median 4 lines, p99 18, max 30.
 */
export const LONG_TEST_LINES = 20;

/** Matches an assignment to `name`: `name = …`, `name += …`, `name++`, `--name`. */
const assignmentTo = name => new RegExp(`(?<![.\\w$])${name}\\s*(?:[-+*/%]?=(?![=>])|\\+\\+|--)|(?:\\+\\+|--)\\s*${name}\\b`, 'g');

/**
 * The checks from the flakiness and readability claims in
 * references/evidence.md. Failures are exact patterns,
 * warnings are heuristics a reader judges, and info is context for the one
 * file being edited, printed only with `--info`.
 */
function flakeAndReadingFindings(path, source, clean, tests) {
    const found = { focused: [], unawaited: [], unretried: [], held: [], logged: [], environment: [], network: [], shared: [], longTests: [], mockedOwn: [], reassigned: [] };
    const at = index => `${path}:${lineOf(clean, index)}`;
    const playwright = PLAYWRIGHT.test(source);
    // A comment is blanked to spaces, so a call that starts on a space was in a comment.
    const live = match => clean[match.index] !== ' ';

    for (const match of clean.matchAll(FOCUSED)) {
        found.focused.push(`${at(match.index)}: .only runs this and skips every other test in the file`);
    }

    for (const span of tests) {
        const body = clean.slice(span.start, span.end);

        // Failures: an assertion that runs too early, or reads the page once.
        for (const match of body.matchAll(/(\bawait\s+|\breturn\s+|=>\s*)?\bexpect(\s*\.\s*(?:poll|soft))?\s*\(/g)) {
            const open = span.start + match.index + match[0].length - 1;
            const close = closingParen(clean, open);
            if (close === -1) continue;
            const tail = clean.slice(close + 1);
            const async = /poll/.test(match[2] ?? '') || ASYNC_CHAIN.test(tail) || (playwright && WEB_FIRST_CHAIN.test(tail));
            // An expression body starts after its `=>`, so look back past the span for it.
            const returned = match[1] || /=>\s*$/.test(clean.slice(Math.max(0, span.start - 20), span.start + match.index));
            if (async && !returned) found.unawaited.push(`${at(open)}: async assertion with no await, so the test can end before it runs`);
            const read = playwright && clean.slice(open + 1, close).match(ONE_TIME_READ);
            if (read) found.unretried.push(`${at(open)}: expect(await …${read[1]}()) reads the page once; use a web-first matcher, which retries`);
        }

        // The same read, held in a variable that a later expect checks.
        // Not flagged: a read inside `expect(async () => …).toPass()`, which retries it, and a
        // read after an awaited `expect`, which already waited for the page.
        if (playwright) {
            const retried = [...body.matchAll(/\bexpect\s*\(\s*async\b/g)].map(match => ({ start: match.index, end: closingParen(body, body.indexOf('(', match.index)) }));
            for (const held of body.matchAll(HELD_READ)) {
                const rest = body.slice(held.index + held[0].length);
                if (!new RegExp(`\\bexpect\\s*\\(\\s*${held[1]}\\b`).test(rest)) continue;
                if (retried.some(call => held.index > call.start && held.index < call.end)) continue;
                if (/\bawait\s+expect\b/.test(body.slice(0, held.index))) continue;
                found.held.push(`${at(span.start + held.index)}: ${held[1]} holds a one-time ${held[2]}() read, and expect(${held[1]}) checks it once; use expect.poll or a web-first matcher, which retries`);
            }
        }

        // Probe output left in a test: the value is computed and logged, not asserted.
        for (const match of body.matchAll(/\bconsole\s*\.\s*(?:log|debug|info)\s*\(/g)) {
            found.logged.push(`${at(span.start + match.index)}: console output inside a test body; assert the value or delete the line`);
        }

        // Warnings: an input the test does not control, and a test too long to read.
        if (![...source.matchAll(ENV_CONTROLLED)].some(live)) {
            for (const match of body.matchAll(/\bprocess\s*\.\s*env\b/g)) {
                found.environment.push(`${at(span.start + match.index)}: process.env inside a test body; stub it with your runner's env stub and restore it in an after-hook`);
            }
        }
        // Read the raw source: `stubGlobal('fetch'` names what it stubs in a string.
        if (!playwright && !NETWORK_CONTROLLED.test(source)) {
            for (const match of source.slice(span.start, span.end).matchAll(NETWORK_CALL)) {
                if (clean[span.start + match.index] === ' ') continue;
                found.network.push(`${at(span.start + match.index)}: a real network call inside a test body`);
            }
        }
        const lines = lineOf(clean, span.end) - lineOf(clean, span.start) - 1;
        if (lines > LONG_TEST_LINES) found.longTests.push(`${path}:${span.line}: test body is ${lines} lines, over ${LONG_TEST_LINES}`);

        // Info: a let that the test reassigns. A `for (let i = 0; …; i++)` counter
        // is loop state, and the `for` already fails as control flow.
        for (const declaration of body.matchAll(/(?<!\bfor\s*\(\s*)\blet\s+([A-Za-z_$][\w$]*)/g)) {
            // Read from just past the name, so the declaration's own `= …` cannot match.
            const after = body.slice(declaration.index + declaration[0].length);
            if (assignmentTo(declaration[1]).test(after)) found.reassigned.push(`${at(span.start + declaration.index)}: ${declaration[1]} is reassigned inside the test`);
        }
    }

    // Warning: a let outside the tests that a test assigns and no beforeEach resets.
    const resets = testBodies(clean, '(?<!\\.)\\bbeforeEach\\s*\\(');
    for (const declaration of clean.matchAll(/\blet\s+([A-Za-z_$][\w$]*)/g)) {
        if (tests.some(span => declaration.index > span.start && declaration.index < span.end)) continue;
        const name = declaration[1];
        // A test that declares the name itself assigns its own variable, not the shared one.
        const ownDeclaration = new RegExp(`\\b(?:let|const|var)\\s+${name}\\b`);
        const assignedInTest = tests.some(span => {
            const body = clean.slice(span.start, span.end);
            return !ownDeclaration.test(body) && assignmentTo(name).test(body);
        });
        const resetInHook = resets.some(span => assignmentTo(name).test(clean.slice(span.start, span.end)));
        if (assignedInTest && !resetInHook) found.shared.push(`${at(declaration.index)}: ${name} is shared between tests: a test assigns it and no beforeEach resets it`);
    }

    // Info: a mock of the project's own module.
    for (const match of source.matchAll(OWN_MODULE_MOCK)) {
        if (!live(match)) continue;
        found.mockedOwn.push(`${at(match.index)}: mock of your own module ${match[1]}; a mock of domain code couples the test to it`);
    }

    return found;
}

/**
 * One test body written twice in one file. The second copy adds no check, and
 * a change that reaches one copy and not the other is the cost of duplication
 * (code_quality-48).
 *
 * Only within a file. Fourteen tests in one suite share a body word for word and
 * check fourteen different modules through their imports, as `const items` does for
 * `definitionsIn`.
 */
export function duplicatedTests(bodies) {
    const copies = new Map();
    for (const { at, body } of bodies) {
        const key = `${at.slice(0, at.lastIndexOf(':'))}\n${body}`;
        copies.set(key, [...(copies.get(key) ?? []), at]);
    }

    return [...copies.values()]
        .filter(places => places.length > 1)
        .map(places => `same test body at ${places.join(', ')}`);
}

function testFilesUnder(path) {
    if (!statSync(path, { throwIfNoEntry: false })) return [];
    if (statSync(path).isFile()) return TEST_FILE.test(path) ? [path] : [];

    return readdirSync(path, { withFileTypes: true }).flatMap(entry =>
        SKIPPED.has(entry.name) || entry.name.startsWith('.') ? [] : testFilesUnder(join(path, entry.name)),
    );
}

/** The roots in the project's config file, or the working directory. */
function defaultRoots() {
    if (!statSync(CONFIG, { throwIfNoEntry: false })) return ['.'];
    return JSON.parse(readFileSync(CONFIG, 'utf8')).roots;
}

/**
 * Blanks comments but keeps string bodies, so two copies that differ only in a
 * literal stay different.
 *
 * ponytail: a regex literal holding a quote opens a false string; fine for
 * comparing top-level definitions, wrong for anything that needs positions.
 */
export function blankComments(source) {
    let out = '';
    let quote = null;

    for (let i = 0; i < source.length; i++) {
        const char = source[i];
        if (quote) {
            out += char;
            if (char === '\\') out += source[++i] ?? '';
            else if (char === quote) quote = null;
            continue;
        }
        if (char === '/' && source[i + 1] === '/') {
            const end = source.indexOf('\n', i);
            i = (end === -1 ? source.length : end) - 1;
            continue;
        }
        if (char === '/' && source[i + 1] === '*') {
            const end = source.indexOf('*/', i + 2);
            i = (end === -1 ? source.length : end + 2) - 1;
            continue;
        }
        if (char === '"' || char === "'" || char === '`') quote = char;
        out += char;
    }
    return out;
}

/**
 * End of a top-level `const` statement: a `;` or a line break at bracket depth
 * zero, unless the line plainly continues (`=`, `=>`, `,` or an open paren last).
 */
function statementEnd(source, from) {
    let depth = 0;
    for (let i = from; i < source.length; i++) {
        const char = source[i];
        if ('([{'.includes(char)) depth++;
        else if (')]}'.includes(char)) depth--;
        else if (depth === 0 && char === ';') return i;
        else if (depth === 0 && char === '\n' && !/[=>,(]\s*$/.test(source.slice(from, i))) return i;
    }
    return source.length;
}

const FUNCTION_VALUE = /^(?:async\s+)?(?:function\b|\w+\s*=>|\([^]*?\)\s*(?::[^=]+)?=>)/;
const STRING_VALUE = /^(['"`])(?:\\.|(?!\1)[^\\$])*\1\s*;?$/;

/**
 * The helpers and string constants defined at the top level of a spec file,
 * each with its body normalised: comments dropped, whitespace collapsed, its
 * own name replaced. Two definitions with the same `body` are the same code,
 * whatever each file calls it.
 *
 * Only those two kinds are compared, because only they carry their meaning in
 * their own text. `const items = [...firstItems, ...]` reads the same in
 * six tests and names six different lists through the imports, and
 * `createRequire(import.meta.url)` is boilerplate that never changes. Both
 * appeared in a name-matched report. `let` is per-file state.
 */
export function definitionsIn(source) {
    const clean = blankNoise(source);
    const definitions = [];

    const add = (name, kind, start, end) => {
        const body = squeezed(blankComments(source.slice(start, end))
            .replace(/^export\s+/, '')
            .replace(new RegExp(`\\b${name}\\b`), '<name>'));
        definitions.push({ name, kind, body });
    };

    for (const match of clean.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm)) {
        const span = bodyAfter(clean, afterParams(clean, match.index));
        if (span) add(match[1], 'function', match.index, span.end + 1);
    }
    for (const match of clean.matchAll(/^(?:export\s+)?const\s+(\w+)\s*(?::[^=\n]+)?=/gm)) {
        const from = match.index + match[0].length;
        const end = statementEnd(clean, from);
        if (FUNCTION_VALUE.test(clean.slice(from, end).trim())) add(match[1], 'function', match.index, end);
        else if (STRING_VALUE.test(source.slice(from, end).trim())) add(match[1], 'string', match.index, end);
    }

    return definitions;
}

/**
 * The same helper body in two spec files, under any name.
 *
 * The cost of a copy is the change that reaches one copy and not the other
 * (code_quality-48). Comparing names got that wrong both ways: it failed
 * boilerplate that never changes and helpers that share only a name, which
 * only a rename could clear, and a rename cleared a real copy just
 * as well. Comparing bodies catches the renamed copy and lets the rest through.
 */
export function duplicatedHelpers(byFile) {
    const copies = new Map();

    for (const [file, definitions] of byFile) {
        for (const { name, body } of definitions) {
            copies.set(body, [...(copies.get(body) ?? []), { file, name }]);
        }
    }

    return [...copies.values()]
        .filter(owners => new Set(owners.map(owner => owner.file)).size > 1)
        .map(owners => {
            const names = [...new Set(owners.map(owner => owner.name))].join(' / ');
            const files = owners.map(owner => owner.file).join(', ');
            return `${names}: same body in ${owners.length} spec files — ${files}`;
        });
}

/**
 * One helper name with different bodies in two spec files.
 *
 * Not a copy, so not a failure. It can be a copy that already drifted:
 * two `signIn` helpers both start a session through the API, with
 * different parameters. Read both, and move them to
 * support/ only if they must change together.
 */
export function sameNameHelpers(byFile) {
    const owners = new Map();

    for (const [file, definitions] of byFile) {
        for (const { name, kind, body } of definitions) {
            if (kind === 'function') owners.set(name, [...(owners.get(name) ?? []), { file, body }]);
        }
    }

    return [...owners]
        .filter(([, found]) => new Set(found.map(owner => owner.file)).size > 1)
        .filter(([, found]) => new Set(found.map(owner => owner.body)).size > 1)
        .map(([name, found]) => `${name}: different bodies in ${found.length} spec files — ${found.map(owner => owner.file).join(', ')}`);
}

/** The source of the module that `specifier` names from `file`, or null. */
function readRelative(file, specifier) {
    const base = join(dirname(file), specifier);
    const found = ['', '.ts', '.js', '.mjs', '/index.ts', '/index.js']
        .map(extension => base + extension)
        .find(candidate => statSync(candidate, { throwIfNoEntry: false })?.isFile());
    return found ? readFileSync(found, 'utf8') : null;
}

export function main(argv) {
    // `--info` adds context lines for the file being edited. They never fail a run.
    const info = argv.includes('--info');
    const named = argv.slice(2).filter(argument => argument !== '--info');
    const files = (named.length ? named : defaultRoots()).flatMap(testFilesUnder);

    const merged = {};
    const definitions = new Map();

    for (const file of files) {
        const path = relative(process.cwd(), file).replace(/\\/g, '/');
        const source = readFileSync(file, 'utf8');
        for (const [kind, list] of Object.entries(checkFile(path, source, specifier => readRelative(file, specifier)))) merged[kind] = [...(merged[kind] ?? []), ...list];
        definitions.set(path, definitionsIn(source));
    }

    const found = kind => merged[kind] ?? [];
    const failures = found('failures');
    const warnings = found('warnings');
    const weak = found('weak');
    const ambient = found('ambient');
    const sleeps = found('sleeps');
    const unasserted = found('unasserted');
    const folded = found('folded');
    const leaks = found('leaks');
    const duplicates = duplicatedHelpers(definitions);
    const sameNames = sameNameHelpers(definitions);
    const twiceWritten = duplicatedTests(found('bodies'));

    // Each list under its own heading, so no total adds two kinds of finding.
    const report = (heading, entries) => {
        if (!entries.length) return;
        console.log(`\n${heading} (${entries.length}):`);
        for (const entry of entries) console.log(`  ${entry}`);
    };

    console.log(`Test files: ${files.length}`);
    report('Info — mock of your own module', info ? found('mockedOwn') : []);
    report('Info — variable reassigned inside a test', info ? found('reassigned') : []);
    report('Warnings — control flow in a helper', warnings);
    report('Warnings — control flow in a hook', found('hookFlow'));
    report('Warnings — ambient state in a helper or hook', found('helperAmbient'));
    report('Warnings — fixed sleep in a helper or hook', found('helperSleeps'));
    report('Warnings — one helper name, different bodies', sameNames);
    report('Warnings — weak assertion inside a test', weak);
    report('Warnings — local name for a literal as the expected value', found('namedLiterals'));
    report('Warnings — expected value computed with arithmetic', found('computedExpected'));
    report('Warnings — process.env inside a test', found('environment'));
    report('Warnings — real network call inside a test', found('network'));
    report('Warnings — one-time read held in a variable, then asserted', found('held'));
    report('Warnings — console output inside a test', found('logged'));
    report('Warnings — state shared between tests', found('shared'));
    report('Warnings — long test body', found('longTests'));
    report('Failures — copied helper', duplicates);
    report('Failures — control flow inside a test', failures);
    report('Failures — ambient state inside a test', ambient);
    report('Failures — fixed sleep inside a test', sleeps);
    report('Failures — test with no assertion', unasserted);
    report('Failures — comparison folded into a boolean assertion', folded);
    report('Failures — expected value imported from the code under test', found('importedExpected'));
    report('Failures — same test body twice', twiceWritten);
    report('Failures — a fake, spy or stub left in place after the test', leaks);
    report('Failures — .only left in a file', found('focused'));
    report('Failures — async assertion with no await', found('unawaited'));
    report('Failures — one-time read inside an e2e assertion', found('unretried'));

    const failed = [failures, duplicates, ambient, sleeps, unasserted, folded, found('importedExpected'), twiceWritten, leaks, found('focused'), found('unawaited'), found('unretried')];
    if (failed.some(list => list.length)) return 1;

    console.log('\nNo test-body failure, and no copied helper or test.');
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main(process.argv));
