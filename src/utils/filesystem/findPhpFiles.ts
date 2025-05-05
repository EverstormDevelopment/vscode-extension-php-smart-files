import * as vscode from "vscode";

/**
 * Returns all PHP file URIs in the workspace, excluding specified folders
 * @returns Promise with array of PHP file URIs
 */
export async function findPhpFiles(): Promise<vscode.Uri[]> {
    // Define folders to exclude
    const excludedFolders = ["vendor", "node_modules"];
    
    // Build the exclude glob pattern
    const excludePattern = `{${excludedFolders.map(folder => folder + "/**").join(",")}}`;
    
    // Find all PHP files, excluding the specified folders
    const phpFiles = await vscode.workspace.findFiles("**/*.php", excludePattern);
    
    return phpFiles;
}