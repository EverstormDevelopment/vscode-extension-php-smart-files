import * as vscode from 'vscode';

/**
 * Checks if a URI points to a file
 * @param uri The URI to check
 * @returns Promise resolving to true if the URI points to a file, false otherwise
 */
export async function isFile(uri: vscode.Uri): Promise<boolean> {
    try {
        const stat = await vscode.workspace.fs.stat(uri);
        return (stat.type & vscode.FileType.File) === vscode.FileType.File;
    } catch (error: unknown) {
        return false;
    }    
}