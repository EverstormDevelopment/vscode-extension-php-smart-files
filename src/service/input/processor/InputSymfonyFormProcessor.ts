import { InputProcessorInterface } from "../interface/InputProcessorInterface";
import { InputPhpFileNameProcessor } from "./InputPhpFileNameProcessor";


export class InputSymfonyCommandProcessor implements InputProcessorInterface {
    public async process(input: string): Promise<string> {
        if (!input.endsWith("Type")) {
            input += "Type";
        }

        return new InputPhpFileNameProcessor().process(input);
    }
}
