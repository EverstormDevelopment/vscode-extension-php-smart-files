import * as vscode from "vscode";
import { ReservedKeywords } from "../../php/reserved/keywords/ReservedKeywords";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validates that PHP definition names do not conflict with PHP reserved keywords.
 */
export class InputDefinitionNameKeywordValidator implements InputValidatorInterface {
    /**
     * Validates that the definition name is not a PHP reserved keyword.
     * Performs a case-insensitive comparison against the reserved keyword list.
     * @param input The definition name to validate
     * @returns Validation message if input conflicts with reserved words, undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        if (ReservedKeywords.has(input.toLowerCase())) {
            return {
                message: vscode.l10n.t("Cannot use PHP reserved keyword as definition name"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }
        return undefined;
    }
}
