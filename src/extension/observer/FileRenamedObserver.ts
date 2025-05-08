import * as vscode from "vscode";
import { FileRenameOperationTypeEnum } from "../../service/filesystem/file/enum/FileRenameOperationTypeEnum";
import { FileRenameOperationEvent } from "../../service/filesystem/file/event/FileRenameOperationEvent";
import { FileObserverInterface } from "../../service/filesystem/file/interface/FileObserverInterface";
import { FileRenameTracker } from "../../service/filesystem/file/model/FileRenameTracker";
import { NamespaceRefactorer } from "../../service/namespace/model/NamespaceRefactorer";
import { getUriFileName } from "../../utils/filesystem/getUriFileName";

export class FileRenamedObserver implements FileObserverInterface {
    /**
     * Tracks file rename and move operations in the workspace.
     */
    private readonly fileRenameTracker: FileRenameTracker;

    /**
     * Initializes a new observer with namespace refactoring capabilities.
     * @param namespaceRefactorer Service that updates namespaces in PHP files and their references
     */
    constructor(private readonly namespaceRefactorer: NamespaceRefactorer) {
        this.fileRenameTracker = new FileRenameTracker();
    }

    /**
     * Begins observing file rename operations in the workspace.
     * @param context The VS Code extension context used to register disposables
     */
    public watch(context: vscode.ExtensionContext): void {
        this.fileRenameTracker.start(context);

        this.fileRenameTracker.onDidRenameFile(async (event: FileRenameOperationEvent) => {
            this.handleFileRenameOperationEvent(event);
        });
    }

    /**
     * Handles file rename operation events by filtering for rename operations only.
     * @param event The file rename operation event to handle
     */
    private async handleFileRenameOperationEvent(event: FileRenameOperationEvent): Promise<void> {
        if (event.operationType !== FileRenameOperationTypeEnum.Renamed) {
            return;
        }

        await this.handleFileRenamed(event.oldUri, event.newUri);
    }

    /**
     * Processes a file rename operation by possibly triggering namespace refactoring.
     * @param oldUri The original URI of the renamed file
     * @param newUri The new URI of the renamed file
     */
    private async handleFileRenamed(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const config = vscode.workspace.getConfiguration("phpFileCreator");
        const refactorOption = config.get<string>("refactorNamespacesOnFileRenamed", "confirm");
        if (refactorOption === "never") {
            return;
        }

        const newIdentifier = getUriFileName(newUri);
        const shouldRefactor = refactorOption === "always" || (await this.askForRefactor(newIdentifier));
        if (!shouldRefactor) {
            return;
        }

        await this.namespaceRefactorer.updateFileAndReferences(oldUri, newUri);
    }

    /**
     * Prompts the user to confirm namespace refactoring for a renamed file.
     * @param identifier The new identifier
     * @returns True if the user confirmed the refactoring, false otherwise
     */
    private async askForRefactor(identifier: string): Promise<boolean> {
        const refactorMessage = vscode.l10n.t(
            'Would you like to update the declaration identifer to "{0}" and update its references?',
            identifier
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
