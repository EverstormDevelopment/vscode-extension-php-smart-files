import { FileTypeEnum } from "../../utils/php/enum/FileTypeEnum";

/**
 * Registry mapping command names to their corresponding PHP file types.
 * This registry is used to generate VS Code commands for the extension.
 *
 * The keys are the command name suffixes that will be combined with the extension name.
 * The values are the file types that determine the kind of PHP file to create.
 */
export const FileGenerationCommandRegistry: Record<string, FileTypeEnum> = {
    newEmptyPhpFile: FileTypeEnum.File,
    newEmptyPhpFunction: FileTypeEnum.Function,
    newEmptyPhpClass: FileTypeEnum.Class,
    newEmptyPhpInterface: FileTypeEnum.Interface,
    newEmptyPhpEnum: FileTypeEnum.Enum,
    newEmptyPhpTrait: FileTypeEnum.Trait,

    newTemplatePhpFunction: FileTypeEnum.TemplateFunction,
    newTemplatePhpClass: FileTypeEnum.TemplateClass,
    newTemplatePhpInterface: FileTypeEnum.TemplateInterface,
    newTemplatePhpEnum: FileTypeEnum.TemplateEnum,
    newTemplatePhpTrait: FileTypeEnum.TemplateTrait,

    newSymfonyController: FileTypeEnum.SymfonyController,
    newSymfonyCommand: FileTypeEnum.SymfonyCommand,
    newSymfonyForm: FileTypeEnum.SymfonyForm,
};
