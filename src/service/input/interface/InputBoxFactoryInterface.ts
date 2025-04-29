import { InputBoxTypeEnum } from "../enum/InputBoxTypeEnum";
import { InputBoxInterface } from "./InputInterface";

export interface InputBoxFactoryInterface {
    create(type: InputBoxTypeEnum): InputBoxInterface;
}