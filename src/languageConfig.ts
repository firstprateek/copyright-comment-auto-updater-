/**
 * Language-specific comment syntax configuration.
 *
 * Maps VS Code language IDs to their comment delimiters and default
 * copyright template. This is a pure data module with no VS Code
 * API dependency, keeping it trivially testable.
 */

export interface LanguageCommentConfig {
  /** VS Code language identifier */
  languageId: string;
  /** Single-line comment prefix (e.g. "//" or "%") */
  singleLinePrefix?: string;
  /** Block comment opening delimiter (e.g. "/*") */
  blockOpen?: string;
  /** Block comment closing delimiter (e.g. "* /") */
  blockClose?: string;
  /** Default copyright template — uses {year} and {company} placeholders */
  defaultTemplate: string;
}

export const LANGUAGE_CONFIGS: Record<string, LanguageCommentConfig> = {
  javascript: {
    languageId: 'javascript',
    singleLinePrefix: '//',
    blockOpen: '/*',
    blockClose: '*/',
    defaultTemplate: '/* Copyright {year} {company} */',
  },
  typescript: {
    languageId: 'typescript',
    singleLinePrefix: '//',
    blockOpen: '/*',
    blockClose: '*/',
    defaultTemplate: '/* Copyright {year} {company} */',
  },
  cpp: {
    languageId: 'cpp',
    singleLinePrefix: '//',
    blockOpen: '/*',
    blockClose: '*/',
    defaultTemplate: '/* Copyright {year} {company} */',
  },
  matlab: {
    languageId: 'matlab',
    singleLinePrefix: '%',
    defaultTemplate: '% Copyright {year} {company}',
  },
  xml: {
    languageId: 'xml',
    blockOpen: '<!--',
    blockClose: '-->',
    defaultTemplate: '<!-- Copyright {year} {company} -->',
  },
  html: {
    languageId: 'html',
    blockOpen: '<!--',
    blockClose: '-->',
    defaultTemplate: '<!-- Copyright {year} {company} -->',
  },
  css: {
    languageId: 'css',
    blockOpen: '/*',
    blockClose: '*/',
    defaultTemplate: '/* Copyright {year} {company} */',
  },
};

/**
 * Returns the set of supported language IDs.
 */
export function getSupportedLanguageIds(): string[] {
  return Object.keys(LANGUAGE_CONFIGS);
}
