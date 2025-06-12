import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

export class InputDefinitionCharacterValidator implements InputValidatorInterface {

    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        const validNameRegex = /^[\p{L}_][\p{L}\p{N}_]*$/u;
        if (!validNameRegex.test(input)) {
            return {
                message: vscode.l10n.t("Definition name can only contain letters, numbers, and underscores"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }
        return undefined;
    }
}
