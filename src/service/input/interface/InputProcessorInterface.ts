/**
 * Interface for processors that transform input strings.
 * Processors implement this interface to provide transformations on validated input,
 * such as ensuring PHP file names have the correct extension.
 */
export interface InputProcessorInterface {
    /**
     * Processes the input string by applying defined transformations.
     * @param input The input string to process
     * @returns Promise resolving to the processed input string
     */
    process(input: string): Promise<string>;
}
