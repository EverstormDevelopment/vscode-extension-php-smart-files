import path from "path";
import * as vscode from "vscode";
import { FilesystemOperationEnum } from "../enum/FilesystemOperationEnum";
import { FilesystemObserverEvent } from "../event/FilesystemObserverEvent";
import { FilesystemObserverInterface } from "../interface/FileObserverInterface";

/**
 * Tracks filesystem rename operations in the workspace
 */
export class FilesystemObserver implements FilesystemObserverInterface {
    /**
     * Flag to indicate if the observer is currently watching for events
     */
    private isWatching = false;

    /**
     * Event emitter for file rename operations
     */
    private readonly onDidRenameFileEmitter = new vscode.EventEmitter<FilesystemObserverEvent>();

    /**
     * Event that fires when a file is renamed or moved
     */
    public readonly onDidRenameFile = this.onDidRenameFileEmitter.event;

    /**
     * Starts watching filesystem rename operations
     * @param context VS Code extension context
     */
    public watch(context: vscode.ExtensionContext): void {
        if (this.isWatching) {
            return;
        }
        this.isWatching = true;

        const renameDisposable = vscode.workspace.onWillRenameFiles((event) => {
            this.handleRenamedFiles(event);
        });
        context.subscriptions.push(renameDisposable, this.onDidRenameFileEmitter);
    }

    /**
     * Handles renamed files from a file rename event
     * @param event File rename event
     */
    private handleRenamedFiles(event: vscode.FileRenameEvent): void {
        for (const { oldUri, newUri } of event.files) {
            if (!this.isPhpFile(oldUri) || !this.isPhpFile(newUri)) {
                continue;
            }

            const operationType = this.determineOperationType(oldUri, newUri);
            this.onDidRenameFileEmitter.fire({ oldUri, newUri, operation: operationType });
        }
    }

    /**
     * Determines the type of rename operation (move or rename)
     * @param oldUri Original file URI
     * @param newUri New file URI
     * @returns The operation type enum value
     */
    private determineOperationType(oldUri: vscode.Uri, newUri: vscode.Uri): FilesystemOperationEnum {
        const oldDirname = path.dirname(oldUri.fsPath);
        const newDirname = path.dirname(newUri.fsPath);

        return oldDirname === newDirname ? FilesystemOperationEnum.Renamed : FilesystemOperationEnum.Moved;
    }

    /**
     * Checks if a URI represents a PHP file
     * @param uri URI to check
     * @returns True if the file is a PHP file
     */
    private isPhpFile(uri: vscode.Uri): boolean {
        return uri.fsPath.toLowerCase().endsWith(".php");
    }
}
