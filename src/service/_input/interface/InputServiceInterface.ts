/**
 * Interface for input services that handle user input collection
 */
export interface InputServiceInterface {
    /**
     * Prompts user for input with configured options
     * @returns Promise resolving to the user input or undefined if canceled
     */
    promptForInput(): Promise<string | undefined>;
}