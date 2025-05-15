import * as vscode from "vscode";
import { FilesystemObserverEvent } from "../../service/filesystem/observer/event/FilesystemObserverEvent";
import { FilesystemObserverInterface } from "../../service/filesystem/observer/interface/FilesystemObserverInterface";
import { FilesystemObserver } from "../../service/filesystem/observer/model/FilesystemObserver";
import { NamespaceRefactorService } from "../../service/namespace/model/NamespaceRefactorService";

/**
 * Abstract base class for observing file rename/move events and handling PHP namespace refactoring.
 */
export abstract class ObserverAbstract implements FilesystemObserverInterface {
    /**
     * @param filesystemObserver Observer for filesystem rename/move events.
     * @param namespaceRefactorService Service to handle namespace refactoring logic.
     */
    constructor(
        protected readonly filesystemObserver: FilesystemObserver,
        protected readonly namespaceRefactorService: NamespaceRefactorService
    ) {}

    /**
     * Starts watching for file rename/move events and registers the event handler.
     * @param context The VS Code extension context for managing disposables.
     */
    public watch(context: vscode.ExtensionContext): void {
        this.filesystemObserver.watch(context);

        this.filesystemObserver.onDidChange(async (event: FilesystemObserverEvent) => {
            await this.handleChangeEvent(event);
        });
    }

    /**
     * Returns the configuration option name used to control refactoring behavior.
     * @returns The configuration option name as a string.
     */
    protected abstract getConfigurationOptionName(): string;

    /**
     * Returns the confirmation message to display when prompting the user for refactoring.
     * @param oldUri The original file URI.
     * @param newUri The new file URI.
     * @returns A promise resolving to the confirmation message.
     */
    protected abstract getConfirmationMessage(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<string>;

    /**
     * Determines if the given event is valid for triggering a refactor.
     * @param event The filesystem observer event.
     * @returns A promise resolving to true if the event is valid, false otherwise.
     */
    protected abstract isValidEvent(event: FilesystemObserverEvent): Promise<boolean>;

    /**
     * Executes the refactor logic when the user accepts the operation.
     * @param oldUri The original file URI.
     * @param newUri The new file URI.
     * @returns A promise that resolves when refactoring is complete.
     */
    protected abstract onRefactorAccepted(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void>;

    /**
     * Handles a filesystem observer event by validating and processing it.
     * @param event The filesystem observer event.
     */
    private async handleChangeEvent(event: FilesystemObserverEvent): Promise<void> {
        if (await this.isValidEvent(event)) {
            return;
        }

        await this.handleChange(event.oldUri, event.newUri);
    }

    /**
     * Handles the refactor workflow: checks configuration, prompts user if needed, and executes refactor.
     * @param oldUri The original file URI.
     * @param newUri The new file URI.
     */
    private async handleChange(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const config = vscode.workspace.getConfiguration("phpSmartFiles");
        const configOption = this.getConfigurationOptionName();

        const configSetting = config.get<string>(configOption, "confirm");
        if (configSetting === "never") {
            return;
        }

        const shouldRefactor = configSetting === "always" || (await this.confirmRefactor(oldUri, newUri));
        if (!shouldRefactor) {
            return;
        }

        await this.onRefactorAccepted(oldUri, newUri);
    }

    /**
     * Prompts the user to confirm the refactor operation.
     * @param oldUri The original file URI.
     * @param newUri The new file URI.
     * @returns A promise resolving to true if the user confirms, false otherwise.
     */
    private async confirmRefactor(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<boolean> {
        const confirmMessage = await this.getConfirmationMessage(oldUri, newUri);
        const yesButton = vscode.l10n.t("Yes");
        const noButton = vscode.l10n.t("No");
        const pressedButton = await vscode.window.showWarningMessage(
            confirmMessage,
            { modal: true },
            yesButton,
            noButton
        );
        return pressedButton === yesButton;
    }
}
