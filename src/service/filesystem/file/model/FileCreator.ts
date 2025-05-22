import * as path from "path";
import * as vscode from "vscode";
import { isUriFile } from "../../../../utils/filesystem/isUriFile";

/**
 * Service to create files in the workspace.
 */
export class FileCreator {
    /**
     * Creates a new file at the specified URI location
     * @param uri The URI where the file should be created
     * @returns Promise that resolves when the file is created or rejects if creation fails
     * @throws Error if file creation fails
     */
    public async create(uri: vscode.Uri): Promise<void> {
        if (!(await this.canCreateFile(uri))) {
            return;
        }

        try {
            await this.createFile(uri);
        } catch (error: unknown) {
            this.showErrorMessage(error);
            throw error;
        }
    }

    /**
     * Checks if a file can be created at the specified URI and try
     * to get user permission to overwrite if the file already exists
     * @param uri The URI to check
     * @returns Promise resolving to true if file can be created, false otherwise
     */
    private async canCreateFile(uri: vscode.Uri): Promise<boolean> {
        const isExisting = await isUriFile(uri);
        if (!isExisting) {
            return true;
        }
        return this.askForOverwrite(uri);
    }

    /**
     * Prompts the user for permission to overwrite an existing file
     * @param uri The URI of the existing file
     * @returns Promise resolving to true if user confirms overwrite, false otherwise
     */
    private async askForOverwrite(uri: vscode.Uri): Promise<boolean> {
        const fileName = path.basename(uri.fsPath);
        const overwriteMessage = vscode.l10n.t("The file '{0}' already exists. Overwrite?", fileName);
        const overwriteButton = vscode.l10n.t("Overwrite");
        const cancelButton = vscode.l10n.t("Cancel");
        const overwriteReturn = await vscode.window.showWarningMessage(
            overwriteMessage,
            { modal: true },
            overwriteButton,
            cancelButton
        );
        return overwriteReturn === overwriteButton;
    }

    /**
     * Creates an empty file at the specified URI
     * @param uri The URI where to create the file
     * @returns Promise that resolves when the file is created
     */
    private async createFile(uri: vscode.Uri): Promise<void> {
        await vscode.workspace.fs.writeFile(uri, Buffer.from("", "utf8"));
    }

    /**
     * Shows an error message to the user.
     * @param error The error to display
     */
    private showErrorMessage(error: unknown): void {
        vscode.window.showErrorMessage(
            vscode.l10n.t("Error creating file: {0}", error instanceof Error ? error.message : String(error))
        );
    }
}
