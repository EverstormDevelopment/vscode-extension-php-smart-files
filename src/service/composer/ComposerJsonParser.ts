import * as vscode from "vscode";
import { isFile } from "../../utils/filesystem/isFile";

/**
 * Service to parse composer.json files
 */
export class ComposerJsonParser {
    /**
     * Parses a composer.json file
     * @param composerJsonUri URI of the composer.json file to parse
     * @returns Parsed composer.json content as an object
     * @throws Error if the file cannot be read or parsed
     */
    public async parse(composerJsonUri: vscode.Uri): Promise<any> {
        try {
            if (!(await isFile(composerJsonUri))) {
                throw new Error(`Path is not a file: ${composerJsonUri.fsPath}`);
            }

            const content = await vscode.workspace.fs.readFile(composerJsonUri);
            return JSON.parse(Buffer.from(content).toString("utf8"));
        } catch (error: unknown) {
            this.showErrorMessage(vscode.l10n.t("Error reading composer.json"));
            throw error;
        }
    }

    /**
     * Shows an error message to the user
     * @param message The main error message
     */
    private showErrorMessage(message: string): void {
        vscode.window.showErrorMessage(message);
    }
}
