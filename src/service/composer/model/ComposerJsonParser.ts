import * as vscode from "vscode";
import { isUriFile } from "../../../utils/filesystem/isUriFile";
import { ComposerJsonType } from "../type/ComposerJsonType";

/**
 * Service to parse composer.json files for PHP projects.
 */
export class ComposerJsonParser {
    /**
     * Parses a composer.json file into a JavaScript object.
     * @param composerJsonUri URI of the composer.json file to parse
     * @returns Promise resolving to the parsed composer.json content as an object
     * @throws Error if the file cannot be read or parsed
     */
    public async parse(composerJsonUri: vscode.Uri): Promise<ComposerJsonType> {
        try {
            if (!(await isUriFile(composerJsonUri))) {
                throw new Error(`Path is not a file: ${composerJsonUri.fsPath}`);
            }

            const content = await vscode.workspace.fs.readFile(composerJsonUri);
            return JSON.parse(Buffer.from(content).toString("utf8")) as ComposerJsonType;
        } catch (error: unknown) {
            this.showErrorMessage(vscode.l10n.t("Error reading composer.json"));
            throw error;
        }
    }

    /**
     * Shows an error message to the user.
     * @param message The main error message to display
     */
    private showErrorMessage(message: string): void {
        vscode.window.showErrorMessage(message);
    }
}
