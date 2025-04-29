import { InputBoxTypeEnum } from "../enum/InputBoxTypeEnum";
import { InputBoxFactoryInterface } from "../interface/InputBoxFactoryInterface";
import { InputBoxInterface } from "../interface/InputInterface";
import { InputBoxClassFactory } from "./InputBoxClassFactory";
import { InputBoxFileFactory } from "./InputBoxFileFactory";

export class InputBoxFactory implements InputBoxFactoryInterface {

    private readonly factories: Record<InputBoxTypeEnum, () => InputBoxInterface> = {
        [InputBoxTypeEnum.File]: () => new InputBoxFileFactory().create(),
        [InputBoxTypeEnum.Class]: () => new InputBoxClassFactory().create(),
        [InputBoxTypeEnum.Interface]: () => new InputBoxClassFactory().create(),
        [InputBoxTypeEnum.Enum]: () => new InputBoxClassFactory().create(),
        [InputBoxTypeEnum.Trait]: () => new InputBoxClassFactory().create()
    };

    public create(type: InputBoxTypeEnum): InputBoxInterface {
        const factory = this.factories[type];
        if (!factory) {
            throw new Error(`Unknown input box type: ${type}`);
        }
        return factory();
    }
}