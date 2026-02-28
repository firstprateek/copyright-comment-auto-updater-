/**
 * Core copyright detection, parsing, and update/insert logic.
 *
 * Design principles:
 *  - Every helper except `computeCopyrightEdit` is a **pure function**
 *    operating on plain strings / numbers so it can be unit-tested
 *    without mocking the VS Code API.
 *  - The copyright regex is compiled once at module level and reused.
 *  - Only the year character range is replaced — all surrounding text
 *    (comment delimiters, symbols, company name) is preserved.
 */

import * as vscode from 'vscode';
import { LANGUAGE_CONFIGS } from './languageConfig';

// ================================================================
// Types
// ================================================================

export interface CopyrightMatch {
  /** 0-based line index where the copyright was found */
  lineIndex: number;
  /** Full text of the matched line */
  lineText: string;
  /** The first (or only) year in the copyright notice */
  startYear: number;
  /** The second year in a range (e.g. 2020-2025 → 2025), or undefined */
  endYear?: number;
  /** Character offset where the year portion begins in the line */
  yearStartChar: number;
  /** Character offset where the year portion ends in the line */
  yearEndChar: number;
}

export interface UpdateResult {
  /** The TextEdit to apply, or `undefined` when no change is needed */
  edit?: vscode.TextEdit;
  /** Human-readable action taken */
  action:
    | 'updated'
    | 'inserted'
    | 'already-current'
    | 'skipped-no-match'
    | 'skipped-unsupported';
}

export interface CopyrightUpdaterConfig {
  enabled: boolean;
  companyName: string;
  maxScanLines: number;
  autoInsertLanguages: string[];
  commentTemplates: Record<string, string>;
  testFilePatterns: string[];
}

// ================================================================
// Regex — compiled once, reused on every save
// ================================================================

/**
 * Matches a copyright notice and captures the year(s).
 *
 * Examples matched:
 *   Copyright 2024 Acme
 *   Copyright (c) 2020-2025 Acme
 *   Copyright (C) 2024 Acme
 *   Copyright © 2024 Acme
 *   copyright 2024 Acme
 *
 * Capture groups:
 *   1 → start year  (always present, 4 digits)
 *   2 → end year    (optional, 4 digits — present when a range exists)
 */
const COPYRIGHT_REGEX =
  /[Cc]opyright\s*(?:\(c\)|©|\(C\))?\s*(\d{4})(?:\s*[-–—]\s*(\d{4}))?/;

// ================================================================
// Pure helpers
// ================================================================

/**
 * Scans the first `maxLines` lines for a copyright notice.
 * Returns the **first** match, or `undefined`.
 */
export function findCopyright(
  lines: string[],
  maxLines: number,
): CopyrightMatch | undefined {
  const limit = Math.min(lines.length, maxLines);

  for (let i = 0; i < limit; i++) {
    const line = lines[i];
    const match = COPYRIGHT_REGEX.exec(line);

    if (match) {
      const startYear = parseInt(match[1], 10);
      const endYear = match[2] ? parseInt(match[2], 10) : undefined;

      // Locate the character range covering the entire year(s) portion.
      // `match.index` is the start of the full regex match; we need the
      // position of capture-group-1 within the line.
      const fullMatch = match[0];
      const yearPortionStart = match.index + fullMatch.indexOf(match[1]);
      const yearPortionEnd = match.index + fullMatch.length;

      return {
        lineIndex: i,
        lineText: line,
        startYear,
        endYear,
        yearStartChar: yearPortionStart,
        yearEndChar: yearPortionEnd,
      };
    }
  }

  return undefined;
}

/**
 * Computes the replacement year string, or `undefined` if no change is needed.
 *
 * | Before              | Current year | After         |
 * |---------------------|-------------|---------------|
 * | 2024                | 2026        | 2024-2026     |
 * | 2020-2025           | 2026        | 2020-2026     |
 * | 2020-2026           | 2026        | (no change)   |
 * | 2026                | 2026        | (no change)   |
 */
export function computeUpdatedYearString(
  match: CopyrightMatch,
  currentYear: number,
): string | undefined {
  const { startYear, endYear } = match;
  const effectiveEndYear = endYear ?? startYear;

  // Already up-to-date — no edit needed
  if (effectiveEndYear === currentYear) {
    return undefined;
  }

  // Start year equals current year (single year) — no range needed
  if (startYear === currentYear) {
    return undefined;
  }

  return `${startYear}-${currentYear}`;
}

/**
 * Returns the line number at which a brand-new copyright comment should be
 * inserted. Accounts for shebang lines (`#!`) that must remain at byte 0.
 */
export function getInsertionLine(lines: string[]): number {
  if (lines.length > 0 && lines[0].startsWith('#!')) {
    return 1;
  }
  return 0;
}

/**
 * Builds a copyright comment string from a template.
 * Falls back through: user template → language default → generic block comment.
 */
export function buildCopyrightComment(
  languageId: string,
  currentYear: number,
  companyName: string,
  templates: Record<string, string>,
): string {
  const template =
    templates[languageId] ??
    LANGUAGE_CONFIGS[languageId]?.defaultTemplate ??
    `/* Copyright {year} {company} */`;

  return template
    .replace('{year}', String(currentYear))
    .replace('{company}', companyName);
}

// ================================================================
// VS Code integration
// ================================================================

/**
 * Main entry point: computes the `TextEdit` (if any) for a document.
 *
 * This is the **only** function that touches the `vscode` API;
 * all preceding helpers operate on plain data.
 */
export function computeCopyrightEdit(
  document: vscode.TextDocument,
  config: CopyrightUpdaterConfig,
  currentYear: number,
): UpdateResult {
  const { languageId } = document;

  // Unsupported language?
  const supported = Object.keys(LANGUAGE_CONFIGS);
  if (!supported.includes(languageId)) {
    return { action: 'skipped-unsupported' };
  }

  // Read lines up to the scan limit
  const scanLimit = Math.min(document.lineCount, config.maxScanLines);
  const lines: string[] = [];
  for (let i = 0; i < scanLimit; i++) {
    lines.push(document.lineAt(i).text);
  }

  // ---------- Try to update an existing copyright ----------

  const match = findCopyright(lines, config.maxScanLines);

  if (match) {
    const newYearStr = computeUpdatedYearString(match, currentYear);

    if (!newYearStr) {
      return { action: 'already-current' };
    }

    const range = new vscode.Range(
      match.lineIndex,
      match.yearStartChar,
      match.lineIndex,
      match.yearEndChar,
    );

    return { edit: vscode.TextEdit.replace(range, newYearStr), action: 'updated' };
  }

  // ---------- No copyright found — insert if allowed ----------

  if (!config.autoInsertLanguages.includes(languageId)) {
    return { action: 'skipped-no-match' };
  }

  if (!config.companyName) {
    // Cannot produce a meaningful header without a company name
    return { action: 'skipped-no-match' };
  }

  // Read all lines for shebang detection
  const allLines: string[] = [];
  for (let i = 0; i < document.lineCount; i++) {
    allLines.push(document.lineAt(i).text);
  }

  const comment = buildCopyrightComment(
    languageId,
    currentYear,
    config.companyName,
    config.commentTemplates,
  );

  const insertLine = getInsertionLine(allLines);
  const position = new vscode.Position(insertLine, 0);

  return {
    edit: vscode.TextEdit.insert(position, comment + '\n'),
    action: 'inserted',
  };
}
