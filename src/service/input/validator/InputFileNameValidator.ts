import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validator for file names
 * Ensures that file names don't contain invalid characters
 */
export class InputFileNameValidator implements InputValidatorInterface {
    /**
     * Validates a file name
     * @param input The input to validate
     * @returns Error message or empty string if valid
     */
    public async validate(input: string): Promise<string> {
        if (!input || input.trim().length === 0) {
            return vscode.l10n.t("Please enter a valid filename");
        }
        
        const invalidChars = /[\\/:*?"<>|]/;
        if (invalidChars.test(input)) {
            return vscode.l10n.t("Filename contains invalid characters");
        }
        
        return "";
    }
}