/**
 * Enumeration of PHP file types that can be created by the extension.
 * Includes basic PHP elements as well as template versions with pre-populated content.
 */
export enum FileTypeEnum {
    File = "File",
    Class = "Class",
    Interface = "Interface",
    Trait = "Trait",
    Enum = "Enum",

    TemplateClass = "TemplateClass",
    TemplateInterface = "TemplateInterface",
    TemplateTrait = "TemplateTrait",
    TemplateEnum = "TemplateEnum",

    SymfonyController = "SymfonyController",
    SymfonyCommand = "SymfonyCommand",
    SymfonyForm = "SymfonyForm",
}
