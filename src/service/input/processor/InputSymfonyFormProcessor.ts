import { InputProcessorInterface } from "../interface/InputProcessorInterface";
import { InputPhpFileNameProcessor } from "./InputPhpFileNameProcessor";

/**
 * Processor for Symfony form input strings.
 * Ensures that form class names follow the Symfony naming convention
 * by appending "Type" suffix if not already present.
 */
export class InputSymfonyFormProcessor implements InputProcessorInterface {
    /**
     * Processes the input string to ensure proper Symfony form naming.
     * @param input - The input string to process
     * @returns A properly formatted controller name string
     */
    public async process(input: string): Promise<string> {
        if (!input.endsWith("Type")) {
            input += "Type";
        }

        return new InputPhpFileNameProcessor().process(input);
    }
}
