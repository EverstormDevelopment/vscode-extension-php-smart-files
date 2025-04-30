import * as path from "path";
import * as vscode from "vscode";

export class ComposerJsonFinder {
    public async find(targetUri: vscode.Uri): Promise<vscode.Uri | undefined> {
        let currentFolder = targetUri;
        const workspaceRoot = this.getWorkspaceRootUri(targetUri);

        while (true) {
            // Check for composer.json in current folder
            const composerJsonUri = vscode.Uri.joinPath(currentFolder, "composer.json");
            try {
                const stat = await vscode.workspace.fs.stat(composerJsonUri);
                if ((stat.type & vscode.FileType.File) === vscode.FileType.File) {
                    return composerJsonUri;
                }
            } catch (error) {
                // File doesn't exist in the current folder - continue searching
            }

            // Break if we've reached the workspace root
            if (this.isWorkspaceRoot(currentFolder, workspaceRoot)) {
                break;
            }

            // Try to get parent folder, break if we can't go up further
            const parentFolder = this.getParentFolder(currentFolder);
            if (!parentFolder) {
                break;
            }

            currentFolder = parentFolder;
        }
        return undefined;
    }

    /**
     * Gets the parent folder of a given URI
     * @param uri The URI to get the parent folder from
     * @returns The parent folder URI or undefined if at the root
     */
    private getParentFolder(uri: vscode.Uri): vscode.Uri | undefined {
        const dirname = path.dirname(uri.fsPath);
        if (dirname === uri.fsPath) {
            return undefined;
        }
        return vscode.Uri.file(dirname);
    }

    /**
     * Gets the workspace root URI for the given URI
     * @param uri The URI to find the workspace root for
     * @returns The workspace root URI or undefined if not in a workspace
     */
    private getWorkspaceRootUri(uri: vscode.Uri): vscode.Uri | undefined {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        return workspaceFolder?.uri;
    }

    /**
     * Checks if the given folder is the workspace root
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
     * Checks if two URIs point to the same location
     * @param uri1 First URI to compare
     * @param uri2 Second URI to compare
     * @returns True if the URIs point to the same location
     */
    private isSameUri(uri1: vscode.Uri, uri2: vscode.Uri): boolean {
        return uri1.toString() === uri2.toString();
    }
}
