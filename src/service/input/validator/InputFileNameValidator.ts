import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validator for file names in PHP file creation.
 * Ensures that file names comply with file system requirements
 * and don't contain invalid characters that would cause issues with the file system
 * or problems with PHP include/require or URL handling.
 */
export class InputFileNameValidator implements InputValidatorInterface {
    /**
     * Validates a file name against file system and PHP best practices rules.
     * Checks for:
     * - Non-empty input
     * - No invalid characters like \/:*?"<>|
     * - No problematic characters for PHP includes or URLs like #&%[]{}^~`;
     * - No spaces (common PHP best practice)
     * @param input The file name to validate
     * @returns Validation message object if validation fails, or undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        if (!input || input.trim().length === 0) {
            return {
                message: vscode.l10n.t("Please enter a valid filename"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }

        const invalidFileSystemChars = /[\\/:*?"<>|]/;
        if (invalidFileSystemChars.test(input)) {
            return {
                message: vscode.l10n.t("Filename contains characters not allowed by the file system"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }

        const problematicChars = /[ #&%\[\]{}^~`+;]/;
        if (problematicChars.test(input)) {
            return {
                message: vscode.l10n.t("Filename contains characters that may cause issues with PHP includes or URLs"),
                severity: vscode.InputBoxValidationSeverity.Warning,
            };
        }

        return undefined;
    }
}
