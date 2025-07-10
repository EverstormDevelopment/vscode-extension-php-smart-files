import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validates that PHP definition names contain only valid characters.
 * Ensures names follow PHP identifier rules by allowing only letters, numbers, and underscores.
 */
export class InputDefinitionNameCharacterValidator implements InputValidatorInterface {
    /**
     * Validates the character composition of a PHP definition name.
     * @param input The definition name to validate
     * @returns Validation message if invalid characters are found, undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        const validNameRegex = /^[\p{L}_][\p{L}\p{N}_]*$/u;
        if (!validNameRegex.test(input)) {
            return {
                message: vscode.l10n.t("Definition name can only contain letters, numbers, and underscores"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }
        return undefined;
    }
}
