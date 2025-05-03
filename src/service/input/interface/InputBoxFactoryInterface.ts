import { FileTypeEnum } from "../../../utils/enum/FileTypeEnum";
import { InputBoxInterface } from "./InputInterface";


export interface InputBoxFactoryInterface {
    create(type: FileTypeEnum): InputBoxInterface;
}
