import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validator for file names in PHP file creation.
 * Ensures that file names comply with file system requirements
 * and don't contain invalid characters that would cause issues with the file system.
 */
export class InputFileNameValidator implements InputValidatorInterface {
    /**
     * Validates a file name against file system rules.
     * Checks for:
     * - Non-empty input
     * - No invalid characters like \/:*?"<>|
     * @param input The file name to validate
     * @returns Error message if validation fails, or empty string if valid
     */
    public async validate(input: string): Promise<string> {
        if (!input || input.trim().length === 0) {
            return vscode.l10n.t("Please enter a valid filename");
        }

        const invalidChars = /[\\/:*?"<>|]/;
        if (invalidChars.test(input)) {
            return vscode.l10n.t("Filename contains invalid characters");
        }

        return "";
    }
}
