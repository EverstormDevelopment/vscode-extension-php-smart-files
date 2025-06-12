import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

export class InputDefinitionStartValidator implements InputValidatorInterface {

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
