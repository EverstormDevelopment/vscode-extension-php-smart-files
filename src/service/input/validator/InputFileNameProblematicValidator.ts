import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

export class InputFileNameProblematicValidator implements InputValidatorInterface {
    
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        const problematicChars = /[ #&%\[\]{}^~`+;]/;
        if (problematicChars.test(input)) {
            return {
                message: vscode.l10n.t("Filename contains characters that may cause issues with PHP includes or URLs"),
                severity: vscode.InputBoxValidationSeverity.Warning,
            };
        }

        return undefined;
    }
}
