import * as vscode from 'vscode';

export interface FileObserverInterface {
    /**
     * Starts observing file operations in the workspace.
     * @param context The VS Code extension context used to register disposables.
     */
    watch(context: vscode.ExtensionContext): void;
}