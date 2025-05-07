import path from "path";
import * as vscode from "vscode";

/**
 * Extracts the file name (without extension) from a given URI.
 * @param uri The URI of the file.
 * @returns The file name without extension.
 */
export function getUriFileName(uri: vscode.Uri): string {
    return path.parse(uri.fsPath).name;
}
