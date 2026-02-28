/**
 * Extension entry point.
 *
 * Registers a single `onWillSaveTextDocument` listener that inspects
 * the top of every supported source file for a copyright comment and
 * either updates the year or inserts a new header before the save
 * completes.
 */

import * as vscode from 'vscode';
import {
  computeCopyrightEdit,
  CopyrightUpdaterConfig,
} from './copyrightUpdater';
import { isTestFile } from './testFileDetector';
import { getSupportedLanguageIds } from './languageConfig';

let disposable: vscode.Disposable | undefined;

// ================================================================
// Lifecycle
// ================================================================

export function activate(context: vscode.ExtensionContext): void {
  disposable = vscode.workspace.onWillSaveTextDocument(onWillSave);
  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  disposable?.dispose();
}

// ================================================================
// Save handler
// ================================================================

function onWillSave(event: vscode.TextDocumentWillSaveEvent): void {
  try {
    const { document } = event;

    // ---- Fast bail-outs (cheapest checks first) ----

    const supported = getSupportedLanguageIds();
    if (!supported.includes(document.languageId)) {
      return;
    }

    const config = readConfig(document.uri);

    if (!config.enabled) {
      return;
    }

    // Test-file detection needs the file content; read it once.
    const fileContent = document.getText();

    if (
      isTestFile({
        fileName: document.fileName,
        fileContent,
        testFilePatterns: config.testFilePatterns,
      })
    ) {
      return;
    }

    // ---- Compute edit ----

    const currentYear = new Date().getFullYear();
    const result = computeCopyrightEdit(document, config, currentYear);

    if (result.edit) {
      event.waitUntil(Promise.resolve([result.edit]));
    }
  } catch (err) {
    // VS Code disables misbehaving listeners after 3 failures.
    // Swallow the error so the save always proceeds.
    console.error('[CopyrightUpdater] Error processing save:', err);
  }
}

// ================================================================
// Configuration
// ================================================================

function readConfig(uri: vscode.Uri): CopyrightUpdaterConfig {
  const cfg = vscode.workspace.getConfiguration('copyrightUpdater', uri);

  return {
    enabled: cfg.get<boolean>('enabled', true),
    companyName: cfg.get<string>('companyName', ''),
    maxScanLines: cfg.get<number>('maxScanLines', 30),
    autoInsertLanguages: cfg.get<string[]>('autoInsertLanguages', [
      'javascript',
      'typescript',
    ]),
    commentTemplates: cfg.get<Record<string, string>>('commentTemplates', {}),
    testFilePatterns: cfg.get<string[]>('testFilePatterns', [
      '**/*test*',
      '**/*Test*',
      '**/*spec*',
      '**/*Spec*',
    ]),
  };
}
