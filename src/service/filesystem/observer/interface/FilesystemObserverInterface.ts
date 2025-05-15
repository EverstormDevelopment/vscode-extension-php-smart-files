import * as vscode from "vscode";

export interface FilesystemObserverInterface {
    /**
     * Starts observing filesystem operations in the workspace.
     * @param context The VS Code extension context used to register disposables.
     */
    watch(context: vscode.ExtensionContext): void;
}
