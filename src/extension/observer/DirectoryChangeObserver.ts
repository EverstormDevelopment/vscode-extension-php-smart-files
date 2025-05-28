import path from "path";
import * as vscode from "vscode";
import { FilesystemObserverResourceEnum } from "../../service/filesystem/observer/enum/FilesystemObserverResourceEnum";
import { FilesystemObserverEvent } from "../../service/filesystem/observer/event/FilesystemObserverEvent";
import { hasFilesInUriDirectory } from "../../utils/filesystem/hasFilesInUriDirectory";
import { ObserverAbstract } from "./ObserverAbstract";

/**
 * Observer that handles directory change events in the workspace.
 * It detects when directories are moved or renamed and offers to update
 * namespaces and references in PHP files.
 */
export class DirectoryChangeObserver extends ObserverAbstract {
    /**
     * Returns the configuration option name that controls if this observer is enabled.
     * @returns The name of the configuration option as a string
     */
    protected getConfigurationOptionName(): string {
        return "refactorNamespacesOnDirectoryChanges";
    }

    /**
     * Generates the confirmation message to show to the user when a directory change is detected.
     * @param oldUri The URI of the directory before the change
     * @param newUri The URI of the directory after the change
     * @returns A localized message string asking for confirmation
     */
    protected async getConfirmationMessage(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<string> {
        const directory = this.getLastPathSegment(newUri);
        return vscode.l10n.t(
            'Would you like to update all files and their references for directory "{0}"? This operation may take some time depending on the directory content and project size.',
            directory
        );
    }

    /**
     * Validates if the filesystem event should trigger the namespace refactoring prompt.
     * @param event The filesystem observer event to validate
     * @returns Boolean indicating if the event is valid for processing
     */
    protected async isValidEvent(event: FilesystemObserverEvent): Promise<boolean> {
        return this.isDirectoryChangeEvent(event) && (await this.hasPhpFilesInDirectory(event.newUri));
    }

    /**
     * Executes the namespace refactoring when the user accepts the confirmation prompt.
     * @param oldUri The URI of the directory before the change
     * @param newUri The URI of the directory after the change
     */
    protected async onRefactorAccepted(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        this.namespaceRefactorService.refactorDirectory(oldUri, newUri);
    }

    /**
     * Determines if the event is related to a directory change.
     * @param event The filesystem observer event to check
     * @returns Boolean indicating if this is a directory change event
     */
    private isDirectoryChangeEvent(event: FilesystemObserverEvent): boolean {
        return event.resource === FilesystemObserverResourceEnum.Directory;
    }

    /**
     * Checks if the specified directory contains any PHP files.
     * @param directoryUri The URI of the directory to check
     * @returns Boolean indicating if PHP files exist in the directory
     */
    protected async hasPhpFilesInDirectory(directoryUri: vscode.Uri): Promise<boolean> {
        return await hasFilesInUriDirectory(directoryUri, "**/*.php");
    }

    /**
     * Extracts the last segment (folder name) from a URI path.
     * Removes trailing slashes if present before extracting the name.
     * @param uri The URI to process
     * @returns The last segment of the path as a string
     */
    protected getLastPathSegment(uri: vscode.Uri): string {
        return path.basename(uri.fsPath.replace(/[\/\\]$/, ""));
    }
}
