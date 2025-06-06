import * as path from "path";
import * as vscode from "vscode";
import { isUriFile } from "../../../utils/filesystem/isUriFile";

/**
 * Service to find composer.json files in the directory hierarchy.
 */
export class ComposerJsonFinder {
    /**
     * Finds a composer.json file starting from the target folder and moving up the directory hierarchy.
     * The search stops when a composer.json is found, the workspace root is reached, or the filesystem root is reached.
     * @param targetFolder The starting folder URI to search from
     * @returns Promise resolving to the URI of the found composer.json file or undefined if not found
     */
    public async find(targetFolder: vscode.Uri): Promise<vscode.Uri | undefined> {
        let currentFolder = targetFolder;
        const workspaceRoot = this.getWorkspaceRootUri(targetFolder);

        while (true) {
            const composerJsonUri = vscode.Uri.joinPath(currentFolder, "composer.json");
            if (await isUriFile(composerJsonUri)) {
                return composerJsonUri;
            }

            if (this.isWorkspaceRoot(currentFolder, workspaceRoot)) {
                break;
            }

            const parentFolder = this.getParentFolder(currentFolder);
            if (!parentFolder) {
                break;
            }

            currentFolder = parentFolder;
        }
        return undefined;
    }

    /**
     * Gets the parent folder of a given URI.
     * @param uri The URI to get the parent folder from
     * @returns The parent folder URI or undefined if at the filesystem root
     */
    private getParentFolder(uri: vscode.Uri): vscode.Uri | undefined {
        const dirname = path.dirname(uri.fsPath);
        if (dirname === uri.fsPath) {
            return undefined;
        }
        return vscode.Uri.file(dirname);
    }

    /**
     * Gets the workspace root URI for the given URI.
     * @param uri The URI to find the workspace root for
     * @returns The workspace root URI or undefined if not in a workspace
     */
    private getWorkspaceRootUri(uri: vscode.Uri): vscode.Uri | undefined {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        return workspaceFolder?.uri;
    }

    /**
     * Checks if the given folder is the workspace root.
     * @param currentFolder The folder to check
     * @param workspaceFolder The workspace root URI
     * @returns True if the folder is the workspace root, false otherwise
     */
    private isWorkspaceRoot(currentFolder: vscode.Uri, workspaceFolder: vscode.Uri | undefined): boolean {
        if (!workspaceFolder) {
            return false;
        }
        return this.isSameUri(currentFolder, workspaceFolder);
    }

    /**
     * Checks if two URIs point to the same location.
     * @param uri1 First URI to compare
     * @param uri2 Second URI to compare
     * @returns True if the URIs point to the same location
     */
    private isSameUri(uri1: vscode.Uri, uri2: vscode.Uri): boolean {
        return uri1.toString() === uri2.toString();
    }
}
