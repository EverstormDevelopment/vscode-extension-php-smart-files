import path from "path";
import * as vscode from "vscode";
import { isUriDirectory } from "../../../../utils/filesystem/isUriDirectory";
import { isUriFile } from "../../../../utils/filesystem/isUriFile";
import { FilesystemObserverOperationEnum } from "../enum/FilesystemObserverOperationEnum";
import { FilesystemObserverResourceEnum } from "../enum/FilesystemObserverResourceEnum";
import { FilesystemObserverEvent } from "../event/FilesystemObserverEvent";
import { FilesystemObserverInterface } from "../interface/FileObserverInterface";

/**
 * Observes filesystem changes (rename/move) for files and directories within the workspace.
 * Emits events when relevant changes are detected.
 */
export class FilesystemObserver implements FilesystemObserverInterface {
    /**
     * Indicates whether the observer is currently active and listening for events.
     */
    private isWatching = false;

    /**
     * Emitter for filesystem change events.
     */
    private readonly onDidChangeEmitter = new vscode.EventEmitter<FilesystemObserverEvent>();

    /**
     * Event that fires when a file or directory is renamed or moved.
     */
    public readonly onDidChange = this.onDidChangeEmitter.event;

    /**
     * Starts watching for filesystem rename/move operations.
     * @param context The VS Code extension context for managing disposables.
     */
    public watch(context: vscode.ExtensionContext): void {
        if (this.isWatching) {
            return;
        }
        this.isWatching = true;

        const disposable = vscode.workspace.onDidRenameFiles(async (event) => {
            await this.handleRenamedFilesEvent(event);
        });
        context.subscriptions.push(disposable, this.onDidChangeEmitter);
    }

    /**
     * Handles the VS Code file rename event by processing each file change.
     * @param event The file rename event containing all affected files.
     */
    private async handleRenamedFilesEvent(event: vscode.FileRenameEvent): Promise<void> {
        for (const { oldUri, newUri } of event.files) {
            await this.handleFileRenamed(oldUri, newUri);
        }
    }

    /**
     * Processes a single file or directory rename/move operation.
     * Determines the operation type and resource, then emits an event if relevant.
     * @param oldUri The original URI before the operation.
     * @param newUri The new URI after the operation.
     */
    private async handleFileRenamed(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const operation = this.determineOperation(oldUri, newUri);
        const resource = await this.determineRecource(newUri);
        if (!resource) {
            return;
        }
        if (this.isFileResource(resource) && !this.hasPhpFileExtensions(oldUri, newUri)) {
            return;
        }

        this.onDidChangeEmitter.fire({ oldUri, newUri, operation, resource });
    }

    /**
     * Determines the resource type (file or directory) for a given URI.
     * @param uri The URI to check.
     * @returns The resource enum or undefined if not a file or directory.
     */
    private async determineRecource(uri: vscode.Uri): Promise<FilesystemObserverResourceEnum | undefined> {
        if (await isUriFile(uri)) {
            return FilesystemObserverResourceEnum.File;
        }

        if (await isUriDirectory(uri)) {
            return FilesystemObserverResourceEnum.Directory;
        }

        return undefined;
    }

    /**
     * Determines whether the operation is a rename (within the same directory) or a move (to a different directory).
     * @param oldUri The original URI.
     * @param newUri The new URI.
     * @returns The operation enum value.
     */
    private determineOperation(oldUri: vscode.Uri, newUri: vscode.Uri): FilesystemObserverOperationEnum {
        const oldDirname = path.dirname(oldUri.fsPath);
        const newDirname = path.dirname(newUri.fsPath);

        return oldDirname === newDirname
            ? FilesystemObserverOperationEnum.Renamed
            : FilesystemObserverOperationEnum.Moved;
    }

    /**
     * Checks if the given resource type is a file.
     * @param resource The resource enum value.
     * @returns True if the resource is a file, false otherwise.
     */
    private isFileResource(resource: FilesystemObserverResourceEnum): boolean {
        return resource === FilesystemObserverResourceEnum.File;
    }

    /**
     * Checks if both URIs have a PHP file extension.
     * @param oldUri The original URI.
     * @param newUri The new URI.
     * @returns True if both URIs end with ".php", false otherwise.
     */
    private hasPhpFileExtensions(oldUri: vscode.Uri, newUri: vscode.Uri): boolean {
        return this.hasPhpFileExtension(oldUri) && this.hasPhpFileExtension(newUri);
    }

    /**
     * Checks if the given URI has a PHP file extension.
     * @param uri The URI to check.
     * @returns True if the URI ends with ".php" (case-insensitive), false otherwise.
     */
    private hasPhpFileExtension(uri: vscode.Uri): boolean {
        return uri.fsPath.toLowerCase().endsWith(".php");
    }
}
