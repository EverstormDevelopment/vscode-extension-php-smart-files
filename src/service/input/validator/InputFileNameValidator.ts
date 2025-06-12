import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";
import { InputFileNameLengthValidator } from "./InputFileNameLengthValidator";
import { InputFileNameCharacterValidator } from "./InputFileNameCharacterValidator";
import { InputFileNameProblematicValidator } from "./InputFileNameProblematicValidator";

/**
 * Validator for file names in PHP file creation.
 * Ensures that file names comply with file system requirements
 * and don't contain invalid characters that would cause issues with the file system
 * or problems with PHP include/require or URL handling.
 */
export class InputFileNameValidator implements InputValidatorInterface {
    /**
     * Validates a file name against file system and PHP best practices rules.
     * Checks for:
     * - Non-empty input
     * - No invalid characters like \/:*?"<>|
     * - No problematic characters for PHP includes or URLs like #&%[]{}^~`;
     * - No spaces (common PHP best practice)
     * @param input The file name to validate
     * @returns Validation message object if validation fails, or undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        const validators = [
            new InputFileNameLengthValidator(),
            new InputFileNameCharacterValidator(),
            new InputFileNameProblematicValidator(),
        ];

        for (const validator of validators) {
            const validationResult = await validator.validate(input);
            if (validationResult) {
                return validationResult;
            }
        }

        return undefined;
    }
}
