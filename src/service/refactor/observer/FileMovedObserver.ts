import path from "path";
import * as vscode from "vscode";
import { FileRenameOperationTypeEnum } from "../enum/FileRenameOperationTypeEnum";
import { FileRenameOperationEvent } from "../event/FileRenameOperationEvent";
import { FileRenameTracker } from "../model/FileRenameTracker";
import { NamespaceRefactorer } from "./../model/NamespaceRefactorer";

/**
 * Observes file moves in the workspace and initiates namespace refactoring operations
 */
export class FileMovedObserver {
    /**
     * The tracker that detects file rename and move operations
     */
    private readonly fileRenameTracker: FileRenameTracker;

    /**
     * Creates a new file moved observer
     * @param namespaceRefactorer The service that performs the actual namespace refactoring
     */
    constructor(private readonly namespaceRefactorer: NamespaceRefactorer) {
        this.fileRenameTracker = new FileRenameTracker();
    }

    /**
     * Starts tracking file move operations
     * @param context The VS Code extension context
     */
    public start(context: vscode.ExtensionContext): void {
        this.fileRenameTracker.start(context);

        this.fileRenameTracker.onDidRenameFile(async (event: FileRenameOperationEvent) => {
            this.handleFileRenameOperationEvent(event);
        });
    }

    /**
     * Processes a file rename operation event
     * @param event The file rename operation event to process
     */
    private async handleFileRenameOperationEvent(event: FileRenameOperationEvent): Promise<void> {
        if (event.operationType !== FileRenameOperationTypeEnum.Moved) {
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
        const shouldRefactor = await this.askForRefactor(newUri);
        if (!shouldRefactor) {
            return;
        }

        await this.namespaceRefactorer.updateFileAndReferences(oldUri, newUri);
    }

    /**
     * Prompts the user to confirm namespace refactoring
     * @param fileUri The URI of the moved file
     * @returns True if the user confirmed the refactoring, false otherwise
     */
    private async askForRefactor(fileUri: vscode.Uri): Promise<boolean> {
        const fileName = path.basename(fileUri.fsPath);
        const refactorMessage = vscode.l10n.t(
            'Would you like to update the namespace for "{0}" and all its references?',
            fileName
        );
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
