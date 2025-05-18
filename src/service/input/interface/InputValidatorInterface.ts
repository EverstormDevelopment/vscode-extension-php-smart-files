import * as vscode from "vscode";

/**
 * Interface for validators that check input strings for correctness.
 * Validators implement this interface to provide custom validation logic
 * for different types of inputs like file names or PHP class names.
 */
export interface InputValidatorInterface {
    /**
     * Validates the input string against defined rules.
     * @param input The input string to validate
     * @returns Promise resolving to a validation message object or undefined if valid
     */
    validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined>;
}
