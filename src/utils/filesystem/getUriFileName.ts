import path from "path";
import * as vscode from "vscode";

/**
 * Extracts the file name (without extension) from a given URI.
 * @param uri The URI of the file.
 * @returns The file name without extension.
 */
export function getUriFileName(uri: vscode.Uri, withExtension?: boolean): string {
    const parsed = path.parse(uri.fsPath);
    return withExtension ? parsed.base : parsed.name;
}
