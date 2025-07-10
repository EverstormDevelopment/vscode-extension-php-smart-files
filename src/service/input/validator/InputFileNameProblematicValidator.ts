import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validates file names for characters that may cause issues with PHP includes or URLs.
 * Warns about potentially problematic characters that could cause issues in web environments.
 */
export class InputFileNameProblematicValidator implements InputValidatorInterface {
    /**
     * Validates that the file name doesn't contain characters that may cause issues.
     * Checks for characters that could cause problems with PHP includes, URLs, or web servers.
     * Returns a warning (not an error) to allow users to proceed if they understand the risks.
     * @param input The file name to validate
     * @returns Warning message if problematic characters are found, undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
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
