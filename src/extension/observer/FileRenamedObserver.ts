import * as vscode from "vscode";
import { FilesystemObserverOperationEnum } from "../../service/filesystem/observer/enum/FilesystemObserverOperationEnum";
import { FilesystemObserverResourceEnum } from "../../service/filesystem/observer/enum/FilesystemObserverResourceEnum";
import { FilesystemObserverEvent } from "../../service/filesystem/observer/event/FilesystemObserverEvent";
import { getUriFileName } from "../../utils/filesystem/getUriFileName";
import { ObserverAbstract } from "./ObserverAbstract";

/**
 * Observer that handles file rename operations and updates PHP declarations and references.
 * When a PHP file is renamed, this observer detects the change and offers to refactor
 * the class/interface name and update all references to match the new file name.
 */
export class FileRenamedObserver extends ObserverAbstract {
    /**
     * Returns the configuration option name that enables or disables this observer.
     * @returns The name of the configuration setting controlling this observer.
     */
    protected getConfigurationOptionName(): string {
        return "refactorNamespacesOnFileRenamed";
    }

    /**
     * Generates a confirmation message to prompt the user about identifier refactoring.
     * @param oldUri The original URI of the file before it was renamed.
     * @param newUri The new URI of the file after it was renamed.
     * @returns A localized confirmation message including the new file name.
     */
    protected async getConfirmationMessage(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<string> {
        const name = getUriFileName(newUri);
        return vscode.l10n.t(
            'Would you like to update the declaration identifer to "{0}" and update its references?',
            name
        );
    }

    /**
     * Determines if the filesystem event should trigger this observer.
     * Only responds to file rename operations.
     * @param event The filesystem observer event to validate.
     * @returns True if the event is a file rename operation, false otherwise.
     */
    protected async isValidEvent(event: FilesystemObserverEvent): Promise<boolean> {
        return (
            event.resource === FilesystemObserverResourceEnum.File &&
            event.operation === FilesystemObserverOperationEnum.Renamed
        );
    }

    /**
     * Handles the declaration and reference refactoring when the user accepts the confirmation prompt.
     * @param oldUri The original URI of the file before it was renamed.
     * @param newUri The new URI of the file after it was renamed.
     * @returns A Promise that resolves when the refactoring is complete.
     */
    protected async onRefactorAccepted(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        await this.namespaceRefactorService.refactorFile(oldUri, newUri);
    }
}
