import { InputProcessorInterface } from "../interface/InputProcessorInterface";

/**
 * Processor for PHP file names
 * Ensures that file names have the .php extension
 */
export class InputPhpFileNameProcessor implements InputProcessorInterface {
    /**
     * Processes the input to ensure it has a .php extension
     * @param input The input string to process
     * @returns The input string with .php extension if not already present
     */
    public async process(input: string): Promise<string> {
        if (!input.toLowerCase().endsWith(".php")) {
            return `${input}.php`;
        }
        return input;
    }
}