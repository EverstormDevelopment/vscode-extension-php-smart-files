import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

export class InputDefinitionLengthValidator implements InputValidatorInterface {

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
