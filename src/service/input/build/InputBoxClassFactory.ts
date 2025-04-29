import { InputBoxTypeEnum } from "../enum/InputBoxTypeEnum";
import { InputBoxFactoryInterface } from "../interface/InputBoxFactoryInterface";
import { InputBoxInterface } from "../interface/InputInterface";
import { InputBox } from "../model/InputBox";

export class InputBoxClassFactory implements InputBoxFactoryInterface {
    create(type: InputBoxTypeEnum): InputBoxInterface {
        return new InputBox();
    }
}