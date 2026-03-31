import * as vscode from "vscode";
import { FilesystemObserverOperationEnum } from "../../service/filesystem/observer/enum/FilesystemObserverOperationEnum";
import { FilesystemObserverResourceEnum } from "../../service/filesystem/observer/enum/FilesystemObserverResourceEnum";
import { FilesystemObserverEvent } from "../../service/filesystem/observer/event/FilesystemObserverEvent";
import { FilesystemObserver } from "../../service/filesystem/observer/model/FilesystemObserver";
import { NamespaceRefactorService } from "../../service/namespace/service/NamespaceRefactorService";
import { ReservedKeywords } from "../../service/php/reserved/ReservedKeywords";
import { getUriFileName } from "../../utils/filesystem/getUriFileName";
import { ObserverAbstract } from "./ObserverAbstract";

/**
 * Observer that handles file rename operations and updates PHP declarations and references.
 * When a PHP file is renamed, this observer detects the change and offers to refactor
 * the class/interface name and update all references to match the new file name.
 */
export class FileRenamedObserver extends ObserverAbstract {
    /**
     * @param filesystemObserver Observer for filesystem rename/move events.
     * @param namespaceRefactorService Service to handle namespace refactoring logic.
     */
    constructor(
        protected readonly filesystemObserver: FilesystemObserver,
        protected readonly namespaceRefactorService: NamespaceRefactorService,
    ) {
        super(filesystemObserver, namespaceRefactorService);
    }

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
        return vscode.l10n.t('Would you like to update the declaration identifer to "{0}" and update its references?', name);
    }

    /**
     * Determines if the filesystem event should trigger this observer.
     * Only responds to file rename operations.
     * @param event The filesystem observer event to validate.
     * @returns True if the event is a file rename operation, false otherwise.
     */
    protected async isValidEvent(event: FilesystemObserverEvent): Promise<boolean> {
        return event.resource === FilesystemObserverResourceEnum.File && event.operation === FilesystemObserverOperationEnum.Renamed;
    }

    /**
     * Handles the declaration and reference refactoring when the user accepts the confirmation prompt.
     * @param oldUri The original URI of the file before it was renamed.
     * @param newUri The new URI of the file after it was renamed.
     * @returns A Promise that resolves when the refactoring is complete.
     */
    protected async onRefactorAccepted(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const isValid = await this.validateRenaming(newUri);
        if (!isValid) {
            return;
        }

        await this.namespaceRefactorService.refactorFile(oldUri, newUri);
    }

    /**
     * Validates if the new file name is not a PHP reserved keyword.
     * If it is reserved, prompts the user for confirmation before proceeding with the refactoring.
     * @param newUri The new URI of the file after it was renamed.
     * @returns A Promise that resolves to true if the name is valid or user confirms, false otherwise.
     */
    private async validateRenaming(newUri: vscode.Uri): Promise<boolean> {
        const name = getUriFileName(newUri);
        const isReserved = ReservedKeywords.has(name.toLowerCase());
        if (!isReserved) {
            return true;
        }

        return await this.confirmGlobalReservedName(name);
    }

    /**
     * Prompts the user to confirm renaming a file to a reserved keyword.
     * If the user confirms, it proceeds with the refactoring.
     * @param name The reserved keyword that the user is trying to use.
     * @returns A Promise that resolves to true if the user confirmed, false otherwise.
     */
    private async confirmGlobalReservedName(name: string): Promise<boolean> {
        const confirmMessage = vscode.l10n.t(
            'Warning: The new file name "{0}" is a PHP reserved keyword. This may cause errors or unpredictable behavior in your project. Do you want to proceed and update the declaration identifier and all its references?',
            name,
        );

        const yesButton = vscode.l10n.t("Yes");
        const noButton = vscode.l10n.t("No");
        const pressedButton = await vscode.window.showWarningMessage(confirmMessage, { modal: true }, yesButton, noButton);
        return pressedButton === yesButton;
    }
}
