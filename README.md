# Copyright Comment Auto-Updater

Automatically keeps copyright year comments up to date every time you save a file. No more stale `Copyright 2023` headers — just save and it's done.

---

## Features

- **Updates on save** — detects existing copyright comments in the first N lines and bumps the year to the current year
- **Auto-inserts headers** — adds a new copyright comment to JS/TS files that don't have one yet
- **Preserves formatting** — only touches the year portion; your comment style, symbols, and spacing stay intact
- **Skips test files** — automatically excludes files with `test` or `spec` in the name, class name, or a comment
- **Multi-language** — JavaScript, TypeScript, C++, MATLAB, XML, HTML, and CSS out of the box
- **Fully configurable** — company name, comment templates, scan depth, auto-insert languages, and test file patterns

## How It Works

When you save a supported source file, the extension scans the first 30 lines (configurable) for a comment containing the word "copyright" and a year. If found, it updates the year. If not found (and the language allows auto-insert), it adds a new copyright header at line 1.

### Year Update Examples

| Before | After (in 2026) |
|--------|-----------------|
| `/* Copyright 2024 Acme */` | `/* Copyright 2024-2026 Acme */` |
| `// Copyright (c) 2020-2025 Acme` | `// Copyright (c) 2020-2026 Acme` |
| `% Copyright 2020-2026 Acme` | *(no change — already current)* |
| `<!-- Copyright 2024 Acme -->` | `<!-- Copyright 2024-2026 Acme -->` |

### Supported Comment Formats

The extension recognises these copyright patterns regardless of comment syntax:

```
Copyright 2024 Company
Copyright (c) 2020-2025 Company
Copyright (C) 2024 Company
Copyright © 2024 Company
copyright 2024 Company
```

## Configuration

Add these to your `settings.json` (all are optional):

```jsonc
{
  // Enable or disable (default: true)
  "copyrightUpdater.enabled": true,

  // Company name for newly inserted headers (default: "")
  "copyrightUpdater.companyName": "Acme Corp",

  // How many lines from the top to scan (default: 30)
  "copyrightUpdater.maxScanLines": 30,

  // Languages that get a new header when none exists (default: JS & TS)
  "copyrightUpdater.autoInsertLanguages": ["javascript", "typescript"],

  // Custom comment templates per language
  "copyrightUpdater.commentTemplates": {
    "javascript": "/* Copyright {year} {company} */",
    "typescript": "/* Copyright {year} {company} */",
    "cpp": "/* Copyright {year} {company} */",
    "matlab": "% Copyright {year} {company}",
    "xml": "<!-- Copyright {year} {company} -->",
    "html": "<!-- Copyright {year} {company} -->",
    "css": "/* Copyright {year} {company} */"
  },

  // Glob patterns for test files to exclude
  "copyrightUpdater.testFilePatterns": [
    "**/*test*",
    "**/*Test*",
    "**/*spec*",
    "**/*Spec*"
  ]
}
```

### Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Master on/off switch |
| `companyName` | `string` | `""` | Company name in new headers. Required for auto-insert. |
| `maxScanLines` | `number` | `30` | Lines from the top to scan for an existing copyright |
| `autoInsertLanguages` | `string[]` | `["javascript", "typescript"]` | Languages where a missing copyright triggers auto-insert |
| `commentTemplates` | `object` | *(see above)* | Per-language comment templates. Use `{year}` and `{company}` as placeholders. |
| `testFilePatterns` | `string[]` | *(see above)* | Glob patterns for files to skip |

All settings support `scope: "resource"`, so you can set different values per workspace folder.

## Behaviour by Language

| Language | Auto-update existing? | Auto-insert new? |
|----------|-----------------------|------------------|
| JavaScript | Yes | Yes (default) |
| TypeScript | Yes | Yes (default) |
| C++ | Yes | No* |
| MATLAB | Yes | No* |
| XML | Yes | No* |
| HTML | Yes | No* |
| CSS | Yes | No* |

*\* Can be enabled by adding the language ID to `autoInsertLanguages`.*

## Test File Exclusion

A file is considered a test file (and skipped) if **any** of these are true:

1. The filename contains `test` or `spec` (case-insensitive)
2. The file path matches a configured glob pattern
3. A class declaration in the file has `test` in its name
4. A comment in the file says "test file"

## FAQ

**Will this touch my test files?**
No. Test files are automatically detected and skipped. You can customise the detection patterns via `testFilePatterns`.

**What if my copyright format is different?**
The extension matches broadly — it looks for the word "copyright" followed by a year. It only replaces the year characters, so your existing formatting is preserved.

**Does it work with multi-root workspaces?**
Yes. All settings use resource scope, so each workspace folder can have its own company name and templates.

**What about shebangs?**
If the file starts with `#!`, the copyright comment is inserted on line 2 (after the shebang).

**Does it need any permissions?**
No. The extension only listens to save events on text documents. It does not access the filesystem, network, or any other VS Code API beyond text editing.

## Release Notes

### 0.1.0

- Initial release
- Auto-update copyright years on save
- Auto-insert copyright headers in JS/TS files
- Support for JavaScript, TypeScript, C++, MATLAB, XML, HTML, and CSS
- Configurable company name, templates, scan depth, and test file patterns

## License

[MIT](LICENSE)
