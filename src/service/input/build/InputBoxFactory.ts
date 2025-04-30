import { InputBoxTypeEnum } from "../enum/InputBoxTypeEnum";
import { InputBoxFactoryInterface } from "../interface/InputBoxFactoryInterface";
import { InputBoxInterface } from "../interface/InputInterface";

/**
 * Factory for creating input boxes based on type
 * This class uses the Factory pattern to create different types of input boxes
 */
export class InputBoxFactory implements InputBoxFactoryInterface {
    /**
     * Map of factory functions for different input box types
     */
    private readonly factories: Record<InputBoxTypeEnum, () => InputBoxInterface> = {
        [InputBoxTypeEnum.File]: () => new InputBoxFileFactory().create(),
        [InputBoxTypeEnum.Class]: () => new InputBoxClassFactory().create(),
        [InputBoxTypeEnum.Interface]: () => new InputBoxClassFactory().create(),
        [InputBoxTypeEnum.Enum]: () => new InputBoxClassFactory().create(),
        [InputBoxTypeEnum.Trait]: () => new InputBoxClassFactory().create()
    };

    /**
     * Creates an input box for the specified type
     * @param type The type of input box to create
     * @returns An input box interface implementation
     * @throws Error if the specified type is not supported
     */
    public create(type: InputBoxTypeEnum): InputBoxInterface {
        const factory = this.factories[type];
        if (!factory) {
            throw new Error(`Unknown input box type: ${type}`);
        }
        return factory();
    }
}