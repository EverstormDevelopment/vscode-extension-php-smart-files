import * as vscode from "vscode";
import { getFilesInUriDirectory } from "./getFilesInUriDirectory";

/**
 * Checks if a directory contains any files matching the specified pattern.
 * @param directoryUri The URI of the directory to check
 * @param pattern The glob pattern to match files (default: all files)
 * @return Promise resolving to true if matching files exist, false otherwise
 */
export async function hasFilesInUriDirectory(directoryUri: vscode.Uri, pattern: string = "**/*"): Promise<boolean> {
    const files = await getFilesInUriDirectory(directoryUri, pattern, 1);
    return files.length > 0;
}
