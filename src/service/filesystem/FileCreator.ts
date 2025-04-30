import * as vscode from "vscode";
import * as path from "path";

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
        const canCreateFile = await this.canCreateFile(filePath);
        if (!canCreateFile) {
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
        const isExisting = await this.isExistingFile(filePath);
        if (!isExisting) {
            return true;
        }
        return this.askForOverwrite(filePath);
    }

    /**
     * Checks if a file exists at the specified path
     * @param filePath URI to check for existence
     * @returns True if a file exists at the path, false otherwise
     */
    private async isExistingFile(filePath: vscode.Uri): Promise<boolean> {
        try {
            const stat = await vscode.workspace.fs.stat(filePath);
            return (stat.type & vscode.FileType.File) === vscode.FileType.File;
        } catch (error: unknown) {
            return false;
        }
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
        const overwriteReturn = await vscode.window.showWarningMessage(
            overwriteMessage,
            { modal: true },
            overwriteButton
        );
        return overwriteReturn === overwriteButton;
    }

    /**
     * Creates an empty file at the specified path
     * @param filePath URI where to create the file
     * @throws Error if file creation fails
     */
    private async createFile(filePath: vscode.Uri): Promise<void> {
        try {
            await vscode.workspace.fs.writeFile(filePath, Buffer.from("", "utf8"));
        } catch (error) {
            throw new Error(`Failed to create file: ${error instanceof Error ? error.message : String(error)}`);
        }
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
