/**
 * Enumeration of PHP file types that can be created by the extension.
 * Includes basic PHP elements as well as template versions with pre-populated content.
 */
export enum FileTypeEnum {
    File = "File",
    Class = "Class",
    Interface = "Interface",
    Enum = "Enum",
    Trait = "Trait",

    TemplateClass = "TemplateClass",
    TemplateInterface = "TemplateInterface",
    TemplateEnum = "TemplateEnum",
    TemplateTrait = "TemplateTrait",
}
