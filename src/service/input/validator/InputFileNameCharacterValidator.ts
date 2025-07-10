import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validates file names for character compatibility with file systems and PHP autoloaders.
 * Provides two validation modes: basic file system compatibility and strict autoloader compatibility.
 */
export class InputFileNameCharacterValidator implements InputValidatorInterface {
    /**
     * Creates a new file name character validator.
     * @param autoloaderConform Whether to use strict autoloader-compatible validation (letters, numbers, underscores only) or basic file system validation
     */
    constructor(private autoloaderConform: boolean = false) {}

    /**
     * Validates a file name based on the configured validation mode.
     * @param input The file name to validate
     * @returns Validation message if invalid characters are found, undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        return this.autoloaderConform ? this.validateForAutoloader(input) : this.validateForFilesystem(input);
    }

    /**
     * Validates file name for basic file system compatibility.
     * Checks for characters that are forbidden by most file systems: \/:*?"<>|
     * @param input The file name to validate
     * @returns Validation message if forbidden characters are found, undefined if valid
     */
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

    /**
     * Validates file name for strict autoloader compatibility.
     * Only allows letters, numbers, and underscores to ensure maximum compatibility across systems.
     * @param input The file name to validate
     * @returns Validation message if non-autoloader-compatible characters are found, undefined if valid
     */
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
