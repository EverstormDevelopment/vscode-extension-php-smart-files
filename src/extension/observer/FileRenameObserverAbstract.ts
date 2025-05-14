import * as vscode from "vscode";
import { FilesystemOperationTypeEnum } from "../../service/filesystem/observer/enum/FilesystemOperationTypeEnum";
import { FilesystemOperationEvent } from "../../service/filesystem/observer/event/FilesystemOperationEvent";
import { FilesystemObserverInterface } from "../../service/filesystem/observer/interface/FileObserverInterface";
import { FilesystemObserver } from "../../service/filesystem/observer/model/FilesystemObserver";
import { NamespaceRefactorService } from "../../service/namespace/model/NamespaceRefactorService";
import { getUriFileName } from "../../utils/filesystem/getUriFileName";

/**
 * Observer that handles file move operations in the workspace.
 * Updates namespaces and references when PHP files are moved.
 */
export class FileRenameObserverAbstract implements FilesystemObserverInterface {
    /**
     * Tracks file rename and move operations in the workspace.
     */
    private readonly fileRenameTracker: FilesystemObserver;

    constructor(
        protected readonly namespaceRefactorService: NamespaceRefactorService,
        private readonly fileRenameOperationTypeEnum: FilesystemOperationTypeEnum,
        private readonly refactorOptionName: string,
        private readonly refactorMessage: string
    ) {
        this.fileRenameTracker = new FilesystemObserver();
    }

    /**
     * Begins observing file move operations in the workspace.
     * @param context The VS Code extension context used to register disposables
     */
    public watch(context: vscode.ExtensionContext): void {
        this.fileRenameTracker.watch(context);

        this.fileRenameTracker.onDidRenameFile(async (event: FilesystemOperationEvent) => {
            this.handleFileRenameOperationEvent(event);
        });
    }

    /**
     * Handles file rename operation events by filtering for move operations only.
     * @param event The file rename operation event to handle
     */
    private async handleFileRenameOperationEvent(event: FilesystemOperationEvent): Promise<void> {
        if (event.operationType !== this.fileRenameOperationTypeEnum) {
            return;
        }

        await this.handleFileMoved(event.oldUri, event.newUri);
    }

    /**
     * Processes a file move operation after it has been detected
     * @param oldUri The URI of the file at its original location
     * @param newUri The URI of the file at its new location
     */
    private async handleFileMoved(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const config = vscode.workspace.getConfiguration("phpSmartFiles");
        const refactorOption = config.get<string>(this.refactorOptionName, "confirm");
        if (refactorOption === "never") {
            return;
        }

        const shouldRefactor = refactorOption === "always" || (await this.confirmRefactor(newUri));
        if (!shouldRefactor) {
            return;
        }

        await this.namespaceRefactorService.refactorFileAndReferences(oldUri, newUri);
    }

    /**
     * Prompts the user to confirm namespace refactoring
     * @param fileUri The URI of the moved file
     * @returns True if the user confirmed the refactoring, false otherwise
     */
    private async confirmRefactor(fileUri: vscode.Uri): Promise<boolean> {
        const name = getUriFileName(fileUri);
        const refactorMessage = vscode.l10n.t(this.refactorMessage, name);
        const yesButton = vscode.l10n.t("Yes");
        const noButton = vscode.l10n.t("No");
        const pressedButton = await vscode.window.showWarningMessage(
            refactorMessage,
            { modal: true },
            yesButton,
            noButton
        );
        return pressedButton === yesButton;
    }
}
