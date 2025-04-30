import * as vscode from "vscode";
import { isFile } from "../../../utils/isFile";

export class ComposerJsonParser {
    public async parse(composerJsonUri: vscode.Uri): Promise<any> {
        try {
            if (!await isFile(composerJsonUri)) {
                throw new Error(`Path is not a file: ${composerJsonUri.fsPath}`);
            }

            const content = await vscode.workspace.fs.readFile(composerJsonUri);
            return JSON.parse(Buffer.from(content).toString("utf8"));
        } catch (error: unknown) {
            this.showErrorMessage("Error reading composer.json", error);
            throw error;
        }
    }

    /**
     * Shows an error message to the user
     * @param message The main error message
     * @param error The error object
     */
    private showErrorMessage(message: string, error: unknown): void {
        vscode.window.showErrorMessage(
            vscode.l10n.t("{0}: {1}", message, error instanceof Error ? error.message : String(error))
        );
    }
}
