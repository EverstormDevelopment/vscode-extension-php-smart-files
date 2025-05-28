import * as vscode from "vscode";
import { FilesystemObserverOperationEnum } from "../../service/filesystem/observer/enum/FilesystemObserverOperationEnum";
import { FilesystemObserverResourceEnum } from "../../service/filesystem/observer/enum/FilesystemObserverResourceEnum";
import { FilesystemObserverEvent } from "../../service/filesystem/observer/event/FilesystemObserverEvent";
import { getUriFileName } from "../../utils/filesystem/getUriFileName";
import { ObserverAbstract } from "./ObserverAbstract";

/**
 * Observer that handles file move operations and updates PHP namespaces accordingly.
 * When a PHP file is moved, this observer detects the change and offers to refactor
 * the namespace in the file and update all references to it.
 */
export class FileMovedObserver extends ObserverAbstract {
    /**
     * Returns the configuration option name that enables or disables this observer.
     * @returns The name of the configuration setting controlling this observer.
     */
    protected getConfigurationOptionName(): string {
        return "refactorNamespacesOnFileMoved";
    }

    /**
     * Generates a confirmation message to prompt the user about namespace refactoring.
     * @param oldUri The original URI of the file before it was moved.
     * @param newUri The new URI of the file after it was moved.
     * @returns A localized confirmation message including the file name.
     */
    protected async getConfirmationMessage(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<string> {
        const name = getUriFileName(newUri);
        return vscode.l10n.t('Would you like to update the namespace for "{0}" and all its references?', name);
    }

    /**
     * Determines if the filesystem event should trigger this observer.
     * Only responds to file move operations.
     * @param event The filesystem observer event to validate.
     * @returns True if the event is a file move operation, false otherwise.
     */
    protected async isValidEvent(event: FilesystemObserverEvent): Promise<boolean> {
        return (
            event.resource === FilesystemObserverResourceEnum.File &&
            event.operation === FilesystemObserverOperationEnum.Moved
        );
    }

    /**
     * Handles the namespace refactoring when the user accepts the confirmation prompt.
     * @param oldUri The original URI of the file before it was moved.
     * @param newUri The new URI of the file after it was moved.
     * @returns A Promise that resolves when the refactoring is complete.
     */
    protected async onRefactorAccepted(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        await this.namespaceRefactorService.refactorFile(oldUri, newUri);
    }
}
