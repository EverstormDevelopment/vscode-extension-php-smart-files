import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validates that PHP definition names start with appropriate characters.
 * Ensures names follow PHP naming conventions by starting with (uppercase) letters or underscores.
 */
export class InputDefinitionNameStartValidator implements InputValidatorInterface {
    constructor(private readonly allowLowercase: boolean = false) {}

    /**
     * Validates that the definition name starts with an (uppercase) letter or underscore.
     * Follows PHP naming conventions for classes, interfaces, traits, and enums.
     * @param input The definition name to validate
     * @returns Validation message if input doesn't start correctly, undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        return this.allowLowercase
            ? this.validateCharactersOnly(input)
            : this.validateCharactersWithUppercase(input);
    }

    /**
     * Validates that the definition name starts with any letter or underscore.
     * Used for functions or non-OOP files where lowercase letters are allowed.
     * @param input The definition name to validate
     * @returns Validation message if input doesn't start with a letter or underscore, undefined if valid
     */
    private async validateCharactersOnly(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        return this.validateRegExp(input, /^[\p{L}_]/u, "Definition name must start with a letter or underscore");
    }

    /**
     * Validates that the definition name starts with an uppercase letter or underscore.
     * Used for OOP definitions (classes, interfaces, traits, enums) to ensure PSR-4 compatibility.
     * @param input The definition name to validate
     * @returns Validation message if input doesn't start with an uppercase letter or underscore, undefined if valid
     */
    private async validateCharactersWithUppercase(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        return this.validateRegExp(input, /^[\p{Lu}_]/u, "Definition name must start with an uppercase letter or underscore");
    }

    /**
     * Helper method that validates input against a regex pattern and returns a validation message.
     * @param input The string to validate
     * @param regExp The regular expression to test against
     * @param errorMessage The error message to display if validation fails
     * @returns Validation message if input doesn't match the regex, undefined if valid
     */
    private async validateRegExp(input: string, regExp: RegExp, errorMessage: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        if (!regExp.test(input)) {
            return {
                message: vscode.l10n.t(errorMessage),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }
        return undefined;
    }
}
