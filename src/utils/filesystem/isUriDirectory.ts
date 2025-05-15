import * as vscode from "vscode";
import { isUriType } from "./isUriType";

/**
 * Checks if a URI points to an existing directory.
 * @param uri - The URI to check
 * @returns Promise resolving to true if the URI points to an existing file, false otherwise
 */
export async function isUriFile(uri: vscode.Uri): Promise<boolean> {
    return isUriType(uri, vscode.FileType.Directory);
}
