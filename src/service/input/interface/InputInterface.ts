/**
 * Interface for input components that prompt users for input.
 */
export interface InputBoxInterface {
    /**
     * Prompts the user for input by displaying an input dialog.
     * @returns Promise resolving to the user input or undefined if canceled
     */
    prompt(): Promise<string | undefined>;
}
