export interface InputValidatorInterface
{
    /**
     * Validates the input string
     * @param input The input string to validate
     * @returns Validation error message or undefined if valid
     */
    validate(input: string): Promise<string>;
}
