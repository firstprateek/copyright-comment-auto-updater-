import * as assert from 'assert';
import {
  findCopyright,
  computeUpdatedYearString,
  getInsertionLine,
  buildCopyrightComment,
  CopyrightMatch,
} from '../copyrightUpdater';
import { isTestFile } from '../testFileDetector';
import { matchesGlob } from '../testFileDetector';
import { getSupportedLanguageIds, LANGUAGE_CONFIGS } from '../languageConfig';

// ================================================================
// findCopyright
// ================================================================

suite('findCopyright', () => {
  test('finds single year in block comment', () => {
    const lines = ['/* Copyright 2024 Acme Corp */'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.lineIndex, 0);
    assert.strictEqual(result.startYear, 2024);
    assert.strictEqual(result.endYear, undefined);
  });

  test('finds year range in block comment', () => {
    const lines = ['/* Copyright 2020-2025 Acme Corp */'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2020);
    assert.strictEqual(result.endYear, 2025);
  });

  test('finds copyright with (c) symbol', () => {
    const lines = ['// Copyright (c) 2024 Acme'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2024);
  });

  test('finds copyright with © symbol', () => {
    const lines = ['// Copyright © 2024 Acme'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2024);
  });

  test('finds copyright with (C) symbol', () => {
    const lines = ['// Copyright (C) 2024 Acme'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2024);
  });

  test('finds lowercase copyright', () => {
    const lines = ['// copyright 2024 Acme'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2024);
  });

  test('finds MATLAB-style copyright', () => {
    const lines = ['% Copyright 2024 Acme'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2024);
  });

  test('finds copyright on a later line', () => {
    const lines = [
      '#!/usr/bin/env node',
      '',
      '/**',
      ' * My Module',
      ' * Copyright 2022 Acme Corp',
      ' */',
    ];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.lineIndex, 4);
    assert.strictEqual(result.startYear, 2022);
  });

  test('returns undefined when no copyright found', () => {
    const lines = ['const x = 1;', 'const y = 2;'];
    const result = findCopyright(lines, 30);
    assert.strictEqual(result, undefined);
  });

  test('respects maxLines limit', () => {
    const lines = Array(35).fill('// nothing here');
    lines[32] = '// Copyright 2024 Acme';
    const result = findCopyright(lines, 30);
    assert.strictEqual(result, undefined);
  });

  test('finds copyright within maxLines limit', () => {
    const lines = Array(35).fill('// nothing here');
    lines[29] = '// Copyright 2024 Acme';
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.lineIndex, 29);
  });

  test('finds en-dash range', () => {
    const lines = ['// Copyright 2020\u20132025 Acme'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2020);
    assert.strictEqual(result.endYear, 2025);
  });

  test('finds em-dash range', () => {
    const lines = ['// Copyright 2020\u20142025 Acme'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2020);
    assert.strictEqual(result.endYear, 2025);
  });

  test('returns first match only when multiple exist', () => {
    const lines = [
      '// Copyright 2022 First Corp',
      '// Copyright 2024 Second Corp',
    ];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.lineIndex, 0);
    assert.strictEqual(result.startYear, 2022);
  });

  test('handles extra spaces', () => {
    const lines = ['// Copyright  (c)  2024  Acme'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2024);
  });

  test('handles range with spaces around dash', () => {
    const lines = ['/* Copyright 2020 - 2025 Acme */'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2020);
    assert.strictEqual(result.endYear, 2025);
  });

  test('yearStartChar and yearEndChar are correct for single year', () => {
    const line = '/* Copyright 2024 Acme */';
    const lines = [line];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    // "2024" starts at index 14 in "/* Copyright 2024 Acme */"
    assert.strictEqual(line.substring(result.yearStartChar, result.yearEndChar), '2024');
  });

  test('yearStartChar and yearEndChar are correct for year range', () => {
    const line = '/* Copyright 2020-2025 Acme */';
    const lines = [line];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(line.substring(result.yearStartChar, result.yearEndChar), '2020-2025');
  });

  test('yearStartChar and yearEndChar are correct with (c) symbol', () => {
    const line = '// Copyright (c) 2020-2025 Acme';
    const lines = [line];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(line.substring(result.yearStartChar, result.yearEndChar), '2020-2025');
  });

  test('handles empty lines array', () => {
    const result = findCopyright([], 30);
    assert.strictEqual(result, undefined);
  });

  test('handles single-line file with copyright', () => {
    const lines = ['/* Copyright 2024 Acme */'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2024);
  });

  test('finds HTML/XML-style copyright', () => {
    const lines = ['<!-- Copyright 2024 Acme Corp -->'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2024);
  });

  test('finds HTML/XML-style copyright range', () => {
    const lines = ['<!-- Copyright 2020-2025 Acme Corp -->'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2020);
    assert.strictEqual(result.endYear, 2025);
  });

  test('finds CSS-style copyright', () => {
    const lines = ['/* Copyright 2024 Acme Corp */'];
    const result = findCopyright(lines, 30);
    assert.ok(result);
    assert.strictEqual(result.startYear, 2024);
  });
});

// ================================================================
// computeUpdatedYearString
// ================================================================

suite('computeUpdatedYearString', () => {
  function makeMatch(startYear: number, endYear?: number): CopyrightMatch {
    return {
      lineIndex: 0,
      lineText: '',
      startYear,
      endYear,
      yearStartChar: 0,
      yearEndChar: 0,
    };
  }

  test('single past year → range', () => {
    const result = computeUpdatedYearString(makeMatch(2024), 2026);
    assert.strictEqual(result, '2024-2026');
  });

  test('range with past end → extended range', () => {
    const result = computeUpdatedYearString(makeMatch(2020, 2025), 2026);
    assert.strictEqual(result, '2020-2026');
  });

  test('range already current → undefined (no change)', () => {
    const result = computeUpdatedYearString(makeMatch(2020, 2026), 2026);
    assert.strictEqual(result, undefined);
  });

  test('single year already current → undefined', () => {
    const result = computeUpdatedYearString(makeMatch(2026), 2026);
    assert.strictEqual(result, undefined);
  });

  test('single year one year behind → range', () => {
    const result = computeUpdatedYearString(makeMatch(2025), 2026);
    assert.strictEqual(result, '2025-2026');
  });

  test('old single year → range', () => {
    const result = computeUpdatedYearString(makeMatch(2015), 2026);
    assert.strictEqual(result, '2015-2026');
  });

  test('range with same start and current year as end → undefined', () => {
    const result = computeUpdatedYearString(makeMatch(2026, 2026), 2026);
    assert.strictEqual(result, undefined);
  });
});

// ================================================================
// getInsertionLine
// ================================================================

suite('getInsertionLine', () => {
  test('empty file → line 0', () => {
    assert.strictEqual(getInsertionLine([]), 0);
  });

  test('normal file → line 0', () => {
    assert.strictEqual(getInsertionLine(['const x = 1;']), 0);
  });

  test('shebang file → line 1', () => {
    assert.strictEqual(
      getInsertionLine(['#!/usr/bin/env node', 'const x = 1;']),
      1,
    );
  });

  test('file with only shebang → line 1', () => {
    assert.strictEqual(getInsertionLine(['#!/bin/bash']), 1);
  });

  test('file starting with comment (not shebang) → line 0', () => {
    assert.strictEqual(getInsertionLine(['// some comment', 'code']), 0);
  });
});

// ================================================================
// buildCopyrightComment
// ================================================================

suite('buildCopyrightComment', () => {
  test('JS default template', () => {
    const result = buildCopyrightComment('javascript', 2026, 'Acme Corp', {});
    assert.strictEqual(result, '/* Copyright 2026 Acme Corp */');
  });

  test('TS default template', () => {
    const result = buildCopyrightComment('typescript', 2026, 'Acme Corp', {});
    assert.strictEqual(result, '/* Copyright 2026 Acme Corp */');
  });

  test('C++ default template', () => {
    const result = buildCopyrightComment('cpp', 2026, 'Acme Corp', {});
    assert.strictEqual(result, '/* Copyright 2026 Acme Corp */');
  });

  test('MATLAB default template', () => {
    const result = buildCopyrightComment('matlab', 2026, 'Acme Corp', {});
    assert.strictEqual(result, '% Copyright 2026 Acme Corp');
  });

  test('custom template overrides default', () => {
    const templates = { javascript: '// (c) {year} {company}' };
    const result = buildCopyrightComment('javascript', 2026, 'Acme Corp', templates);
    assert.strictEqual(result, '// (c) 2026 Acme Corp');
  });

  test('falls back to generic block comment for unknown language', () => {
    const result = buildCopyrightComment('unknown', 2026, 'Acme Corp', {});
    assert.strictEqual(result, '/* Copyright 2026 Acme Corp */');
  });

  test('user template for unknown language takes precedence', () => {
    const templates = { python: '# Copyright {year} {company}' };
    const result = buildCopyrightComment('python', 2026, 'Acme Corp', templates);
    assert.strictEqual(result, '# Copyright 2026 Acme Corp');
  });

  test('XML default template', () => {
    const result = buildCopyrightComment('xml', 2026, 'Acme Corp', {});
    assert.strictEqual(result, '<!-- Copyright 2026 Acme Corp -->');
  });

  test('HTML default template', () => {
    const result = buildCopyrightComment('html', 2026, 'Acme Corp', {});
    assert.strictEqual(result, '<!-- Copyright 2026 Acme Corp -->');
  });

  test('CSS default template', () => {
    const result = buildCopyrightComment('css', 2026, 'Acme Corp', {});
    assert.strictEqual(result, '/* Copyright 2026 Acme Corp */');
  });
});

// ================================================================
// isTestFile
// ================================================================

suite('isTestFile', () => {
  const defaultPatterns = ['**/*test*', '**/*Test*', '**/*spec*', '**/*Spec*'];

  test('filename contains "test" → true', () => {
    assert.ok(
      isTestFile({
        fileName: '/path/to/myFile.test.ts',
        fileContent: '',
        testFilePatterns: defaultPatterns,
      }),
    );
  });

  test('filename contains "Test" → true', () => {
    assert.ok(
      isTestFile({
        fileName: '/path/to/MyTest.ts',
        fileContent: '',
        testFilePatterns: defaultPatterns,
      }),
    );
  });

  test('filename contains "spec" → true', () => {
    assert.ok(
      isTestFile({
        fileName: '/path/to/app.spec.js',
        fileContent: '',
        testFilePatterns: defaultPatterns,
      }),
    );
  });

  test('regular file → false', () => {
    assert.ok(
      !isTestFile({
        fileName: '/path/to/app.ts',
        fileContent: 'const x = 1;',
        testFilePatterns: defaultPatterns,
      }),
    );
  });

  test('class name contains "test" → true', () => {
    assert.ok(
      isTestFile({
        fileName: '/path/to/app.ts',
        fileContent: 'class MyTestClass { }',
        testFilePatterns: [],
      }),
    );
  });

  test('class name contains "Test" (case-insensitive) → true', () => {
    assert.ok(
      isTestFile({
        fileName: '/path/to/app.ts',
        fileContent: 'class SomeTestHelper extends Base { }',
        testFilePatterns: [],
      }),
    );
  });

  test('comment says "test file" → true', () => {
    assert.ok(
      isTestFile({
        fileName: '/path/to/app.ts',
        fileContent: '// This is a test file\nconst x = 1;',
        testFilePatterns: [],
      }),
    );
  });

  test('MATLAB comment says "test file" → true', () => {
    assert.ok(
      isTestFile({
        fileName: '/path/to/app.m',
        fileContent: '% test file\nx = 1;',
        testFilePatterns: [],
      }),
    );
  });

  test('word "test" in normal code does NOT trigger class detection', () => {
    assert.ok(
      !isTestFile({
        fileName: '/path/to/app.ts',
        fileContent: 'const test = true;\nfunction doStuff() {}',
        testFilePatterns: [],
      }),
    );
  });

  test('file in __tests__ directory matches pattern', () => {
    assert.ok(
      isTestFile({
        fileName: '/project/__tests__/foo.ts',
        fileContent: '',
        testFilePatterns: ['**/__tests__/**'],
      }),
    );
  });
});

// ================================================================
// matchesGlob
// ================================================================

suite('matchesGlob', () => {
  test('**/*test* matches file with test in name', () => {
    assert.ok(matchesGlob('/path/to/myFile.test.ts', '**/*test*'));
  });

  test('**/*test* does not match file without test', () => {
    assert.ok(!matchesGlob('/path/to/myFile.ts', '**/*test*'));
  });

  test('**/__tests__/** matches file in __tests__ directory', () => {
    assert.ok(matchesGlob('/project/__tests__/foo.ts', '**/__tests__/**'));
  });

  test('handles windows-style path separators', () => {
    assert.ok(matchesGlob('C:\\project\\__tests__\\foo.ts', '**/__tests__/**'));
  });
});

// ================================================================
// languageConfig
// ================================================================

suite('languageConfig', () => {
  test('getSupportedLanguageIds returns expected languages', () => {
    const ids = getSupportedLanguageIds();
    assert.ok(ids.includes('javascript'));
    assert.ok(ids.includes('typescript'));
    assert.ok(ids.includes('cpp'));
    assert.ok(ids.includes('matlab'));
    assert.ok(ids.includes('xml'));
    assert.ok(ids.includes('html'));
    assert.ok(ids.includes('css'));
  });

  test('all configs have a defaultTemplate', () => {
    for (const [id, config] of Object.entries(LANGUAGE_CONFIGS)) {
      assert.ok(
        config.defaultTemplate.length > 0,
        `${id} should have a defaultTemplate`,
      );
    }
  });

  test('all templates contain {year} and {company} placeholders', () => {
    for (const [id, config] of Object.entries(LANGUAGE_CONFIGS)) {
      assert.ok(
        config.defaultTemplate.includes('{year}'),
        `${id} template should contain {year}`,
      );
      assert.ok(
        config.defaultTemplate.includes('{company}'),
        `${id} template should contain {company}`,
      );
    }
  });
});
