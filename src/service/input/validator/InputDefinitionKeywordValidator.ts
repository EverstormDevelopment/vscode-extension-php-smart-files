import * as vscode from "vscode";
import { GlobalFunctions } from "../../../utils/php/constants/GlobalFunctions";
import { ReservedKeywords } from "../../../utils/php/constants/ReservedKeywords";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validates that PHP definition names do not conflict with reserved keywords or global functions.
 * Prevents use of PHP language keywords and built-in function names as identifiers.
 */
export class InputDefinitionKeywordValidator implements InputValidatorInterface {
    /**
     * Validates that the definition name is not a PHP reserved keyword or global function name.
     * Performs case-insensitive comparison against the reserved keywords and global functions lists.
     * @param input The definition name to validate
     * @returns Validation message if input conflicts with reserved words, undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        if (ReservedKeywords.has(input.toLowerCase()) || GlobalFunctions.has(input.toLowerCase())) {
            return {
                message: vscode.l10n.t("Cannot use PHP reserved keyword as definition name"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }
        return undefined;
    }
}
