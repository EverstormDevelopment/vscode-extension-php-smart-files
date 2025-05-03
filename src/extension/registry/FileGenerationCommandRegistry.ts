import { FileTypeEnum } from "../../utils/enum/FileTypeEnum";

export const FileGenerationCommandRegistry: Record<string, FileTypeEnum> = {
    newEmptyPhpFile: FileTypeEnum.File,
    newEmptyPhpClass: FileTypeEnum.Class,
    newEmptyPhpInterface: FileTypeEnum.Interface,
    newEmptyPhpEnum: FileTypeEnum.Enum,
    newEmptyPhpTrait: FileTypeEnum.Trait,

    newTemplatePhpClass: FileTypeEnum.TemplateClass,
    newTemplatePhpInterface: FileTypeEnum.TemplateInterface,
    newTemplatePhpEnum: FileTypeEnum.TemplateEnum,
    newTemplatePhpTrait: FileTypeEnum.TemplateTrait,
};
