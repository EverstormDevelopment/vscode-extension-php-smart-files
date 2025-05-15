import * as vscode from "vscode";

/**
 * Checks if a URI points to a specific file system type (file, directory, symlink, etc.)
 * @param uri - The URI to check
 * @param type - The file type to check against (vscode.FileType enum value)
 * @returns Promise resolving to true if the URI matches the specified type, false otherwise
 */
export async function isUriType(uri: vscode.Uri, type: vscode.FileType): Promise<boolean> {
    try {
        const stat = await vscode.workspace.fs.stat(uri);
        // Use bitwise AND to check if the file type matches the requested type
        // Since FileType is a bitmask, this correctly handles compound types
        return (stat.type & type) === type;
    } catch (error) {
        return false;
    }
}
