import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/**
 * Service for resolving target folders from URIs and other context
 */
export class UriFolderResolver {
    /**
     * Determines the target folder based on available context
     * @param uri The URI from the command context (if available)
     * @returns The target folder URI or undefined if not determinable
     */
    public getTargetFolder(uri?: vscode.Uri): vscode.Uri | undefined {
        return this.resolveFromUri(uri) || this.resolveFromActiveEditor() || this.resolveFromWorkspace();
    }

    /**
     * Attempts to resolve a folder from the provided URI
     * @param uri The URI to resolve from
     * @returns The resolved folder or undefined
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
     * Attempts to resolve a folder from the active editor
     * @returns The resolved folder or undefined
     */
    private resolveFromActiveEditor(): vscode.Uri | undefined {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.uri.scheme !== "file") {
            return undefined;
        }

        return vscode.Uri.file(path.dirname(activeEditor.document.uri.fsPath));
    }

    /**
     * Attempts to resolve a folder from the workspace folders
     * @returns The resolved folder or undefined
     */
    private resolveFromWorkspace(): vscode.Uri | undefined {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return undefined;
        }
        
        return vscode.workspace.workspaceFolders[0].uri;
    }
}
