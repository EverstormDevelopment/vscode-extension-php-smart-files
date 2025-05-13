import { InputProcessorInterface } from "../interface/InputProcessorInterface";
import { InputPhpFileNameProcessor } from "./InputPhpFileNameProcessor";


export class InputSymfonyControllerProcessor implements InputProcessorInterface {
    public async process(input: string): Promise<string> {
        if (!input.endsWith("Controller")) {
            input += "Controller";
        }

        return new InputPhpFileNameProcessor().process(input);
    }
}
