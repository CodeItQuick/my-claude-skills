import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { backedKeys, missingFields, sectionsIn } from './validate-heuristics.mjs';

describe('sectionsIn', () => {
    it('reads the key, the level and the heading of each section', () => {
        const cli = "const SECTIONS = [\n    ['helper', 'Warnings — control flow in a helper'],\n    ['focused', 'Failures — .only left in a file'],\n];";
        assert.deepEqual(sectionsIn(cli), [
            { key: 'helper', level: 'Warnings', heading: 'control flow in a helper' },
            { key: 'focused', level: 'Failures', heading: '.only left in a file' },
        ]);
    });
});

describe('backedKeys', () => {
    it('finds a section key named in backticks in the Backed in code field', () => {
        const source = '**Rule:** x\n\n**Backed in code:** the `helper` warning in `validate-tests.mjs`.\n\n**Evidence:** `weak`';
        assert.deepEqual(backedKeys(source, ['helper', 'weak']), ['helper']);
    });

    it('finds no key when the field is missing', () => {
        assert.deepEqual(backedKeys('**Rule:** the `helper` warning', ['helper']), []);
    });
});

describe('missingFields', () => {
    it('names each field that the file does not have', () => {
        assert.deepEqual(missingFields('**Rule:** x\n**Apply it:** y\n**Evidence:** z'), ['Backed in code', 'Found by', 'Why no script']);
    });
});
