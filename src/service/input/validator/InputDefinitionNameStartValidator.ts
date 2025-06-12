import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validates that PHP definition names start with appropriate characters.
 * Ensures names follow PHP naming conventions by starting with uppercase letters or underscores.
 */
export class InputDefinitionNameStartValidator implements InputValidatorInterface {
    /**
     * Validates that the definition name starts with an uppercase letter or underscore.
     * Follows PHP naming conventions for classes, interfaces, traits, and enums.
     * @param input The definition name to validate
     * @returns Validation message if input doesn't start correctly, undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        const uppercaseStartRegex = /^[\p{Lu}_]/u;
        if (!uppercaseStartRegex.test(input)) {
            return {
                message: vscode.l10n.t("Definition name must start with an uppercase letter or underscore"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }
        return undefined;
    }
}
