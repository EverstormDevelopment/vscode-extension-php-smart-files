import { InputProcessorInterface } from "../interface/InputProcessorInterface";
import { InputPhpFileNameProcessor } from "./InputPhpFileNameProcessor";

/**
 * Processor for Symfony controller input strings.
 * Ensures that controller names follow the Symfony naming convention
 * by adding the "Controller" suffix if not already present.
 */
export class InputSymfonyControllerProcessor implements InputProcessorInterface {
    /**
     * Processes the input string to ensure proper Symfony controller naming.
     * @param input - The input string to process
     * @returns A properly formatted controller name string
     */
    public async process(input: string): Promise<string> {
        if (!input.endsWith("Controller")) {
            input += "Controller";
        }

        return new InputPhpFileNameProcessor().process(input);
    }
}
