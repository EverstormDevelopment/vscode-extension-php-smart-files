import { FileTypeEnum } from "../../utils/enum/FileTypeEnum";

/**
 * Registry mapping command names to their corresponding PHP file types.
 * This registry is used to generate VS Code commands for the extension.
 * 
 * The keys are the command name suffixes that will be combined with the extension name.
 * The values are the file types that determine the kind of PHP file to create.
 */
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
