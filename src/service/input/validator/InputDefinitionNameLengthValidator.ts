import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validates that PHP definition names are not empty.
 * Ensures basic length requirements for PHP identifier input.
 */
export class InputDefinitionNameLengthValidator implements InputValidatorInterface {
    /**
     * Validates that the definition name input is not empty or whitespace-only.
     * @param input The definition name to validate
     * @returns Validation message if input is empty, undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        if (!input || input.trim().length === 0) {
            return {
                message: vscode.l10n.t("Please enter a valid definition name"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }
        return undefined;
    }
}
