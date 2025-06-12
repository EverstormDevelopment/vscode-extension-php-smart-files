import { FileTypeEnum } from "../../../utils/php/enum/FileTypeEnum";
import { InputBoxInterface } from "./InputInterface";

/**
 * Interface for a factory that creates input box instances based on file types.
 * The factory provides appropriate input validation and configuration for each PHP file type.
 */
export interface InputBoxFactoryInterface {
    /**
     * Creates an input box configured for the specified PHP file type.
     * @param type The type of PHP file to create an input box for
     * @returns An interface for interacting with the configured input box
     */
    create(type: FileTypeEnum): InputBoxInterface;
}
