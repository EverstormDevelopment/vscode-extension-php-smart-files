/**
 * Interface for validators that check input strings
 */
export interface InputValidatorInterface {
    /**
     * Validates the input string
     * @param input The input string to validate
     * @returns Validation error message or empty string if valid
     */
    validate(input: string): Promise<string>;
}
