import * as vscode from "vscode";

/**
 * Gets files in the specified directory matching the given pattern.
 * @param directoryUri The URI of the directory to search
 * @param pattern The glob pattern to match files (default: all files)
 * @param limit Optional maximum number of results
 * @return Promise that resolves to an array of file URIs
 */
export async function getFilesInUriDirectory(
    directoryUri: vscode.Uri,
    pattern: string = "**/*",
    limit?: number
): Promise<vscode.Uri[]> {
    const globPattern = new vscode.RelativePattern(directoryUri.fsPath, pattern);
    const files = await vscode.workspace.findFiles(globPattern, null, limit);

    return files;
}
