import * as vscode from "vscode";
import { FileTypeEnum } from "../../../utils/enum/FileTypeEnum";
import { InputBoxFactoryInterface } from "../interface/InputBoxFactoryInterface";
import { InputBoxInterface } from "../interface/InputInterface";
import { InputPhpFileNameProcessor } from "../processor/InputPhpFileNameProcessor";
import { InputDefinitionNameValidator } from "../validator/InputDefinitionNameValidator";
import { InputFileNameValidator } from "../validator/InputFileNameValidator";
import { InputBoxBuilder } from "./InputBoxBuilder";

/**
 * Factory for creating input boxes based on PHP file types.
 */
export class InputBoxFactory implements InputBoxFactoryInterface {
    /**
     * Creates an input box appropriate for the specified PHP file type.
     * Configures validation, processing, and UI elements based on the type.
     * @param type The PHP file type to create an input box for
     * @returns An input box interface implementation for the specified type
     * @throws Error if an unknown input box type is provided
     */
    public create(type: FileTypeEnum): InputBoxInterface {
        switch (type) {
            case FileTypeEnum.File:
                return this.createFileInputBox();
            case FileTypeEnum.Class:
            case FileTypeEnum.TemplateClass:
                return this.createClassInputBox();
            case FileTypeEnum.Interface:
            case FileTypeEnum.TemplateInterface:
                return this.createInterfaceInputBox();
            case FileTypeEnum.Enum:
            case FileTypeEnum.TemplateEnum:
                return this.createEnumInputBox();
            case FileTypeEnum.Trait:
            case FileTypeEnum.TemplateTrait:
                return this.createTraitInputBox();
            default:
                throw new Error(`Unknown input box type: ${type}`);
        }
    }

    /**
     * Creates an input box configured for PHP file creation.
     * @returns An input box interface implementation for PHP files
     */
    private createFileInputBox(): InputBoxInterface {
        return new InputBoxBuilder()
            .setTitle(vscode.l10n.t("Create PHP File"))
            .setPlaceholder(vscode.l10n.t("Enter filename (without .php)"))
            .setPrompt(vscode.l10n.t("Enter a name for the new PHP file"))
            .setInputValidator(new InputFileNameValidator())
            .setInputProcessor(new InputPhpFileNameProcessor())
            .build();
    }

    /**
     * Creates an input box configured for PHP class creation.
     * @returns An input box interface implementation for PHP classes
     */
    private createClassInputBox(): InputBoxInterface {
        return new InputBoxBuilder()
            .setTitle(vscode.l10n.t("Create PHP Class"))
            .setPlaceholder(vscode.l10n.t("Enter class name"))
            .setPrompt(vscode.l10n.t("Enter a name for the new PHP class"))
            .setInputValidator(new InputDefinitionNameValidator())
            .setInputProcessor(new InputPhpFileNameProcessor())
            .build();
    }

    /**
     * Creates an input box configured for PHP interface creation.
     * @returns An input box interface implementation for PHP interfaces
     */
    private createInterfaceInputBox(): InputBoxInterface {
        return new InputBoxBuilder()
            .setTitle(vscode.l10n.t("Create PHP Interface"))
            .setPlaceholder(vscode.l10n.t("Enter interface name"))
            .setPrompt(vscode.l10n.t("Enter a name for the new PHP interface"))
            .setInputValidator(new InputDefinitionNameValidator())
            .setInputProcessor(new InputPhpFileNameProcessor())
            .build();
    }

    /**
     * Creates an input box configured for PHP enum creation.
     * @returns An input box interface implementation for PHP enums
     */
    private createEnumInputBox(): InputBoxInterface {
        return new InputBoxBuilder()
            .setTitle(vscode.l10n.t("Create PHP Enum"))
            .setPlaceholder(vscode.l10n.t("Enter enum name"))
            .setPrompt(vscode.l10n.t("Enter a name for the new PHP enum"))
            .setInputValidator(new InputDefinitionNameValidator())
            .setInputProcessor(new InputPhpFileNameProcessor())
            .build();
    }

    /**
     * Creates an input box configured for PHP trait creation.
     * @returns An input box interface implementation for PHP traits
     */
    private createTraitInputBox(): InputBoxInterface {
        return new InputBoxBuilder()
            .setTitle(vscode.l10n.t("Create PHP Trait"))
            .setPlaceholder(vscode.l10n.t("Enter trait name"))
            .setPrompt(vscode.l10n.t("Enter a name for the new PHP trait"))
            .setInputValidator(new InputDefinitionNameValidator())
            .setInputProcessor(new InputPhpFileNameProcessor())
            .build();
    }
}
