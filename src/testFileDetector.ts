/**
 * Test file detection.
 *
 * Determines whether a source file is a test file and should be excluded
 * from copyright comment processing. Uses multiple heuristics applied in
 * order of increasing cost.
 */

import * as path from 'path';

export interface TestDetectionContext {
  /** Absolute file path */
  fileName: string;
  /** Full text content of the file */
  fileContent: string;
  /** User-configured glob patterns for test files */
  testFilePatterns: string[];
}

/** Matches a class declaration whose name contains "test" (case-insensitive). */
const CLASS_TEST_REGEX = /class\s+\w*test\w*/i;

/** Matches a comment indicating the file is a test file. */
const TEST_COMMENT_REGEX = /(?:\/\/|\/\*|%|#)\s*(?:this\s+is\s+a\s+)?test\s+file/i;

/**
 * Returns `true` if the file should be treated as a test file.
 *
 * Detection strategies (evaluated in order, bail on first match):
 * 1. Basename contains "test" or "spec" (case-insensitive)
 * 2. File path matches a user-configured glob pattern
 * 3. A class declaration name contains "test"
 * 4. A comment explicitly marks the file as a test file
 */
export function isTestFile(ctx: TestDetectionContext): boolean {
  // 1 — Cheap filename check
  const basename = path.basename(ctx.fileName).toLowerCase();
  if (basename.includes('test') || basename.includes('spec')) {
    return true;
  }

  // 2 — Glob pattern matching (lightweight, no external dependency)
  for (const pattern of ctx.testFilePatterns) {
    if (matchesGlob(ctx.fileName, pattern)) {
      return true;
    }
  }

  // 3 — Class name contains "test"
  if (CLASS_TEST_REGEX.test(ctx.fileContent)) {
    return true;
  }

  // 4 — Comment says it's a test file
  if (TEST_COMMENT_REGEX.test(ctx.fileContent)) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Lightweight glob matching (avoids minimatch dependency)
// ---------------------------------------------------------------------------

/**
 * Converts a simple glob pattern to a RegExp and tests against `filePath`.
 *
 * Supports:
 *  - `**`  → match any path segment(s)
 *  - `*`   → match anything except path separators
 *  - `?`   → match a single character (not a separator)
 *  - Literal characters are escaped for regex safety
 *
 * This covers the patterns users are most likely to configure
 * (e.g. `** / *test*`, `** / __tests__ / **`).
 */
export function matchesGlob(filePath: string, pattern: string): boolean {
  // Normalise path separators to forward slashes for cross-platform matching
  const normalised = filePath.replace(/\\/g, '/');

  const regexStr = globToRegex(pattern);
  return new RegExp(regexStr, 'i').test(normalised);
}

function globToRegex(pattern: string): string {
  let result = '';
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        // "**" — match any number of path segments
        result += '.*';
        i += 2;
        // Skip a trailing slash after "**"
        if (pattern[i] === '/') {
          i++;
        }
      } else {
        // "*" — match anything except "/"
        result += '[^/]*';
        i++;
      }
    } else if (ch === '?') {
      result += '[^/]';
      i++;
    } else if (ch === '/') {
      result += '/';
      i++;
    } else {
      // Escape regex-special characters
      result += escapeRegex(ch);
      i++;
    }
  }

  return result;
}

function escapeRegex(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
