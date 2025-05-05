import * as vscode from "vscode";
import * as path from "path";

/**
 * Extracts the file name from a URI without its extension
 * @param uri The URI to extract the file name from
 * @returns The file name without extension
 */
export function getFileNameWithoutExtension(uri: vscode.Uri): string {
    const fullFileName = path.basename(uri.fsPath);
    const lastDotIndex = fullFileName.lastIndexOf(".");
    
    if (lastDotIndex === -1) {
        // No extension found
        return fullFileName;
    }
    
    return fullFileName.substring(0, lastDotIndex);
}