import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validates that file names are not empty.
 * Ensures basic length requirements for file name input.
 */
export class InputFileNameLengthValidator implements InputValidatorInterface {
    /**
     * Validates that the file name input is not empty or whitespace-only.
     * @param input The file name to validate
     * @returns Validation message if input is empty, undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        if (!input || input.trim().length === 0) {
            return {
                message: vscode.l10n.t("Please enter a valid filename"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }
        return undefined;
    }
}
