import * as vscode from "vscode";
import { GlobalFunctions } from "../../../utils/php/constants/GlobalFunctions";
import { ReservedKeywords } from "../../../utils/php/constants/ReservedKeywords";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

export class InputDefinitionKeywordValidator implements InputValidatorInterface {

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
