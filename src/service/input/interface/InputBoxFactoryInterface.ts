import { InputBoxFileType } from "../type/InputBoxFileType";
import { InputBoxInterface } from "./InputInterface";

/**
 * Interface for factories that create input boxes
 * Implementations of this interface are responsible for creating the appropriate input box
 * based on the provided type.
 */
export interface InputBoxFactoryInterface {
    /**
     * Creates an input box for the specified type
     * @param type The type of input box to create
     * @returns An input box interface implementation
     */
    create(type: InputBoxFileType): InputBoxInterface;
}
