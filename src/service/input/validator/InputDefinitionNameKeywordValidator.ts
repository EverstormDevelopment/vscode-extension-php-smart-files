import * as vscode from "vscode";
import { ContainerFactory } from "../../../container/build/ContainerFactory";
import { GlobalReservedService } from "../../php/GlobalReservedService";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validates that PHP definition names do not conflict with reserved keywords or global functions.
 * Prevents use of PHP language keywords and built-in function names as identifiers.
 */
export class InputDefinitionNameKeywordValidator implements InputValidatorInterface {
    /**
     * Validates that the definition name is not a PHP reserved keyword or global function name.
     * Performs case-insensitive comparison against the reserved keywords and global functions lists.
     * @param input The definition name to validate
     * @returns Validation message if input conflicts with reserved words, undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        const container = ContainerFactory.getDefaultContainer();
        const globalReservedService = container.get(GlobalReservedService);

        if (await globalReservedService.isReserved(input)) {
            return {
                message: vscode.l10n.t("Cannot use PHP reserved keyword as definition name"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }
        return undefined;
    }
}
