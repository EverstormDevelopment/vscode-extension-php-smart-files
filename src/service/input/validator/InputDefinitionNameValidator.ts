import * as vscode from "vscode";
import { GlobalFunctions } from "../../../utils/php/constants/GlobalFunctions";
import { ReservedKeywords } from "../../../utils/php/constants/ReservedKeywords";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validator for PHP definition names (classes, interfaces, traits, enums).
 */
export class InputDefinitionNameValidator implements InputValidatorInterface {
    /**
     * Creates a new validator for PHP definition names
     */
    public constructor() {}

    /**
     * Validates a PHP definition name according to PHP naming rules
     * Checks for:
     * - Non-empty input
     * - Starting with a uppercase letter or underscore
     * - Using only letters, numbers, and underscores
     * - Not using PHP reserved keywords
     * @param input The definition name to validate
     * @returns Validation message object if validation fails, or undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        if (!input || input.trim().length === 0) {
            return {
                message: vscode.l10n.t("Please enter a valid definition name"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }

        const uppercaseStartRegex = /^[\p{Lu}_]/u;
        if (!uppercaseStartRegex.test(input)) {
            return {
                message: vscode.l10n.t("Definition name must start with an uppercase letter or underscore"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }

        const validNameRegex = /^[\p{L}_][\p{L}\p{N}_]*$/u;
        if (!validNameRegex.test(input)) {
            return {
                message: vscode.l10n.t("Definition name can only contain letters, numbers, and underscores"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }

        if (ReservedKeywords.has(input.toLowerCase()) || GlobalFunctions.has(input.toLowerCase())) {
            return {
                message: vscode.l10n.t("Cannot use PHP reserved keyword as definition name"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }

        return undefined;
    }
}
