/**
 * Interface for processors that transform input strings
 */
export interface InputProcessorInterface {
    /**
     * Processes the input string
     * @param input The input string to process
     * @returns Processed input string
     */
    process(input: string): Promise<string>;
}
