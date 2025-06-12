import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";
import { InputFileNameCharacterValidator } from "./InputFileNameCharacterValidator";
import { InputFileNameLengthValidator } from "./InputFileNameLengthValidator";
import { InputFileNameProblematicValidator } from "./InputFileNameProblematicValidator";

/**
 * Validator for file names in PHP file creation.
 * Ensures that file names comply with file system requirements and optionally with autoloader compatibility.
 */
export class InputFileNameValidator implements InputValidatorInterface {
    /**
     * Creates a new file name validator.
     *
     * @param autoloaderConform Whether to use strict autoloader-compatible validation or basic file system validation
     */
    constructor(private readonly autoloaderConform: boolean = false) {}

    /**
     * Validates a file name against file system and optionally autoloader compatibility rules.
     *
     * Validation rules depend on the autoloaderConform setting:
     * - Basic mode: Checks for non-empty input, forbidden file system characters, and problematic characters
     * - Autoloader mode: Checks for non-empty input and strict character rules (letters, numbers, underscores only)
     *
     * @param input The file name to validate
     * @returns Validation message object if validation fails, or undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        const validators = [
            new InputFileNameLengthValidator(),
            new InputFileNameCharacterValidator(this.autoloaderConform),
        ];
        if (!this.autoloaderConform) {
            validators.push(new InputFileNameProblematicValidator());
        }

        for (const validator of validators) {
            const validationResult = await validator.validate(input);
            if (validationResult) {
                return validationResult;
            }
        }

        return undefined;
    }
}
