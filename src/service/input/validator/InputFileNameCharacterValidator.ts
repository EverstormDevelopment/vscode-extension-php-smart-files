import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

export class InputFileNameCharacterValidator implements InputValidatorInterface {
    constructor(private autoloaderConform: boolean = false) {}

    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        return this.autoloaderConform ? this.validateForAutoloader(input) : this.validateForFilesystem(input);
    }

    private async validateForFilesystem(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        const invalidChars = /[\\/:*?"<>|]/;
        if (invalidChars.test(input)) {
            return {
                message: vscode.l10n.t("Filename contains characters not allowed by the file system"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }

        return undefined;
    }

    private async validateForAutoloader(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        const validNameRegex = /^[\p{L}_][\p{L}\p{N}_]*$/u;
        if (!validNameRegex.test(input)) {
            return {
                message: vscode.l10n.t(
                    "Filename can only contain letters, numbers, and underscores, to be autoload compatible"
                ),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }
        return undefined;
    }
}
