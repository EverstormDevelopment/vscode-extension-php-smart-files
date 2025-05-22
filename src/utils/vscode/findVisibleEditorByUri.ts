import * as vscode from "vscode";

/**
 * Finds a visible text editor by its URI.
 * @param uri - The URI of the document to find.
 * @returns The text editor if found, otherwise undefined.
 */
export function findVisibleEditorByUri(uri: vscode.Uri): vscode.TextEditor | undefined {
    return vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === uri.toString());
}
