import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";
import { InputDefinitionCharacterValidator } from "./InputDefinitionCharacterValidator";
import { InputDefinitionKeywordValidator } from "./InputDefinitionKeywordValidator";
import { InputDefinitionLengthValidator } from "./InputDefinitionLengthValidator";
import { InputDefinitionStartValidator } from "./InputDefinitionStartValidator";

/**
 * Validator for PHP definition names (classes, interfaces, traits, enums).
 */
export class InputDefinitionNameValidator implements InputValidatorInterface {
    /**
     * Validates a PHP definition name according to PHP naming rules
     * Checks for:
     * - Non-empty input
     * - Starting with a uppercase letter or underscore
     * - Using only letters, numbers, and underscores
     * - Not using PHP reserved keywords
     * @param input The definition name to validate
     * @returns Validation message object if validation fails, or undefined if valid
     */
    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        const validators = [
            new InputDefinitionLengthValidator(),
            new InputDefinitionStartValidator(),
            new InputDefinitionCharacterValidator(),
            new InputDefinitionKeywordValidator(),
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
