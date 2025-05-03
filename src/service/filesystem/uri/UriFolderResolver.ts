import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

/**
 * Service for resolving target folders from URIs and other context.
 */
export class UriFolderResolver {
    /**
     * Determines the target folder based on available context in VS Code.
     * @param uri The URI from the command context (if available)
     * @returns The target folder URI or undefined if not determinable
     */
    public async getTargetFolder(uri?: vscode.Uri): Promise<vscode.Uri | undefined> {
        return this.resolveFromUri(uri) || this.resolveFromActiveEditor() || (await this.resolveFromWorkspace());
    }

    /**
     * Attempts to resolve a folder from the provided URI.
     * @param uri The URI to resolve from
     * @returns The resolved folder or undefined if not resolvable
     */
    private resolveFromUri(uri?: vscode.Uri): vscode.Uri | undefined {
        if (!uri || uri.scheme !== "file") {
            return undefined;
        }

        try {
            const stat = fs.statSync(uri.fsPath);
            if (stat.isDirectory()) {
                return uri;
            }
            return vscode.Uri.file(path.dirname(uri.fsPath));
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Attempts to resolve a folder from the active editor.
     * @returns The resolved folder or undefined if no suitable editor is active
     */
    private resolveFromActiveEditor(): vscode.Uri | undefined {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.uri.scheme !== "file") {
            return undefined;
        }

        return vscode.Uri.file(path.dirname(activeEditor.document.uri.fsPath));
    }

    /**
     * Attempts to resolve a folder from the workspace folders.
     * If multiple workspaces are available, prompts the user to select one.
     * @returns Promise resolving to the selected folder or undefined
     */
    private async resolveFromWorkspace(): Promise<vscode.Uri | undefined> {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return undefined;
        }

        if (vscode.workspace.workspaceFolders.length === 1) {
            return vscode.workspace.workspaceFolders[0].uri;
        }

        const workspaceOptions = vscode.workspace.workspaceFolders.map((folder) => ({
            label: folder.name,
            description: folder.uri.fsPath,
            uri: folder.uri,
        }));

        const selectedWorkspace = await vscode.window.showQuickPick(workspaceOptions, {
            placeHolder: vscode.l10n.t("Please select a workspace folder"),
            canPickMany: false,
        });

        return selectedWorkspace?.uri;
    }
}
