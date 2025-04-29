export interface InputBoxInterface {
    /**
     * Prompts user for input
     * @returns Promise resolving to the user input or undefined if canceled
     */
    prompt(): Promise<string | undefined>;
}