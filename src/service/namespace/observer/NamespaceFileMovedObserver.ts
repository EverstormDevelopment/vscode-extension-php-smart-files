import path from "path";
import * as vscode from "vscode";
import { FileRenameOperationTypeEnum } from "../../filesystem/file/enum/FileRenameOperationTypeEnum";
import { FileRenameOperationEvent } from "../../filesystem/file/event/FileRenameOperationEvent";
import { FileObserverInterface } from "../../filesystem/file/interface/FileObserverInterface";
import { FileRenameTracker } from "../../filesystem/file/model/FileRenameTracker";
import { NamespaceRefactorer } from "../model/NamespaceRefactorer";

/**
 * Observes file move operations in the workspace and triggers namespace refactoring when PHP files are moved.
 * Acts as a bridge between file system events and namespace refactoring functionality.
 */
export class NamespaceFileMovedObserver implements FileObserverInterface {
    /**
     * Tracks file rename and move operations in the workspace.
     */
    private readonly fileRenameTracker: FileRenameTracker;

    /**
     * Initializes a new observer with namespace refactoring capabilities.
     * @param namespaceRefactorer Service that updates namespaces in PHP files and their references.
     */
    constructor(private readonly namespaceRefactorer: NamespaceRefactorer) {
        this.fileRenameTracker = new FileRenameTracker();
    }

    /**
     * Begins observing file move operations in the workspace.
     * @param context The VS Code extension context used to register disposables.
     */
    public watch(context: vscode.ExtensionContext): void {
        this.fileRenameTracker.start(context);

        this.fileRenameTracker.onDidRenameFile(async (event: FileRenameOperationEvent) => {
            this.handleFileRenameOperationEvent(event);
        });
    }

    /**
     * Processes file rename events and filters for move operations only.
     * @param event Details of the file rename operation that occurred.
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
        const config = vscode.workspace.getConfiguration("phpFileCreator");
        const refactorOption = config.get<string>("refactorNamespacesOnFileMoved", "confirm");
        if (refactorOption === "never") {
            return;
        }

        const shouldRefactor = refactorOption === "always" || (await this.askForRefactor(newUri));
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
