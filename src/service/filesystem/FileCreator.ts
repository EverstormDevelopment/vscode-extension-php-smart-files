import * as path from "path";
import * as vscode from "vscode";
import { isFile } from "../../utils/filesystem/isFile";

/**
 * Service to create files in the workspace
 */
export class FileCreator {
    /**
     * Creates a new file at the specified path
     * @param filePath URI to the file to create
     * @throws Error if the file creation fails
     */
    public async create(filePath: vscode.Uri): Promise<void> {
        if (!(await this.canCreateFile(filePath))) {
            return;
        }

        try {
            await this.createFile(filePath);
        } catch (error: unknown) {
            this.showErrorMessage(error);
            throw error;
        }
    }

    /**
     * Checks if a file can be created at the specified path
     * @param filePath URI to check
     * @returns True if file can be created, false otherwise
     */
    private async canCreateFile(filePath: vscode.Uri): Promise<boolean> {
        const isExisting = await isFile(filePath);
        if (!isExisting) {
            return true;
        }
        return this.askForOverwrite(filePath);
    }

    /**
     * Asks the user if they want to overwrite an existing file
     * @param filePath URI to the file to overwrite
     * @returns True if user confirms overwrite, false otherwise
     */
    private async askForOverwrite(filePath: vscode.Uri): Promise<boolean> {
        const fileName = path.basename(filePath.fsPath);
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
     * Creates an empty file at the specified path
     * @param filePath URI where to create the file
     * @throws Error if file creation fails
     */
    private async createFile(filePath: vscode.Uri): Promise<void> {
        await vscode.workspace.fs.writeFile(filePath, Buffer.from("", "utf8"));
    }

    /**
     * Shows an error message to the user
     * @param error The error to display
     */
    private showErrorMessage(error: unknown): void {
        vscode.window.showErrorMessage(
            vscode.l10n.t("Error creating file: {0}", error instanceof Error ? error.message : String(error))
        );
    }
}
