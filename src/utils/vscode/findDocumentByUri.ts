import * as vscode from "vscode";

/**
 * Finds a TextDocument in the currently open documents by its URI
 * @param uri - The URI of the document to find
 * @returns The TextDocument if found, undefined otherwise
 */
export function findDocumentByUri(uri: vscode.Uri): vscode.TextDocument | undefined {
    return vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === uri.toString());
}
