import * as vscode from "vscode";

/**
 * Checks if a URI points to an existing file.
 * @param uri - The URI to check
 * @returns Promise resolving to true if the URI points to an existing file, false otherwise
 */
export async function isUriFile(uri: vscode.Uri): Promise<boolean> {
    try {
        const stat = await vscode.workspace.fs.stat(uri);
        return (stat.type & vscode.FileType.File) === vscode.FileType.File;
    } catch (error) {
        return false;
    }
}
