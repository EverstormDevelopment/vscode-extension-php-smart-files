import { InputProcessorInterface } from "../interface/InputProcessorInterface";
import { InputPhpFileNameProcessor } from "./InputPhpFileNameProcessor";

/**
 * Processor for Symfony command input strings.
 * Ensures that command names follow the Symfony naming convention by adding "Command" suffix
 * and delegating further processing to InputPhpFileNameProcessor.
 */
export class InputSymfonyCommandProcessor implements InputProcessorInterface {
    /**
     * Processes the input string to ensure proper Symfony command naming.
     * @param input - The input string to process
     * @returns A properly formatted command name string
     */
    public async process(input: string): Promise<string> {
        if (!input.endsWith("Command")) {
            input += "Command";
        }

        return new InputPhpFileNameProcessor().process(input);
    }
}
