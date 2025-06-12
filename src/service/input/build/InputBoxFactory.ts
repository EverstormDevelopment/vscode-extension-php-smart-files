import * as vscode from "vscode";
import { FileTypeEnum } from "../../../utils/php/enum/FileTypeEnum";
import { InputBoxFactoryInterface } from "../interface/InputBoxFactoryInterface";
import { InputBoxInterface } from "../interface/InputInterface";
import { InputPhpFileNameProcessor } from "../processor/InputPhpFileNameProcessor";
import { InputSymfonyCommandProcessor } from "../processor/InputSymfonyCommandProcessor";
import { InputSymfonyControllerProcessor } from "../processor/InputSymfonyControllerProcessor";
import { InputSymfonyFormProcessor } from "../processor/InputSymfonyFormProcessor";
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
            case FileTypeEnum.Function:
            case FileTypeEnum.TemplateFunction:
                return this.createFunctionInputBox();
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
            case FileTypeEnum.SymfonyController:
                return this.createSymfonyControllerInputBox();
            case FileTypeEnum.SymfonyCommand:
                return this.createSymfonyCommandInputBox();
            case FileTypeEnum.SymfonyForm:
                return this.createSymfonyFormInputBox();
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
     * Creates an input box configured for PHP function creation.
     * @returns An input box interface implementation for PHP functions
     */
    private createFunctionInputBox(): InputBoxInterface {
        return new InputBoxBuilder()
            .setTitle(vscode.l10n.t("Create PHP Function"))
            .setPlaceholder(vscode.l10n.t("Enter function name"))
            .setPrompt(vscode.l10n.t("Enter a name for the new PHP function"))
            .setInputValidator(new InputDefinitionNameValidator(true))
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

    /**
     * Creates an input box configured for Symfony controller creation.
     * Configures the box with appropriate validators and processors for Symfony controller naming conventions.
     * @returns An input box interface implementation for Symfony controllers
     */
    private createSymfonyControllerInputBox(): InputBoxInterface {
        return new InputBoxBuilder()
            .setTitle(vscode.l10n.t("Create Symfony Controller"))
            .setPlaceholder(vscode.l10n.t("Enter controller name"))
            .setPrompt(vscode.l10n.t("Enter a name for the new Symfony Controller"))
            .setInputValidator(new InputDefinitionNameValidator())
            .setInputProcessor(new InputSymfonyControllerProcessor())
            .build();
    }

    /**
     * Creates an input box configured for Symfony command creation.
     * Configures the box with appropriate validators and processors for Symfony command naming conventions.
     * @returns An input box interface implementation for Symfony commands
     */
    private createSymfonyCommandInputBox(): InputBoxInterface {
        return new InputBoxBuilder()
            .setTitle(vscode.l10n.t("Create Symfony Command"))
            .setPlaceholder(vscode.l10n.t("Enter command name"))
            .setPrompt(vscode.l10n.t("Enter a name for the new Symfony Command"))
            .setInputValidator(new InputDefinitionNameValidator())
            .setInputProcessor(new InputSymfonyCommandProcessor())
            .build();
    }

    /**
     * Creates an input box configured for Symfony form creation.
     * Configures the box with appropriate validators and processors for Symfony form naming conventions.
     * @returns An input box interface implementation for Symfony forms
     */
    private createSymfonyFormInputBox(): InputBoxInterface {
        return new InputBoxBuilder()
            .setTitle(vscode.l10n.t("Create Symfony Form"))
            .setPlaceholder(vscode.l10n.t("Enter form name"))
            .setPrompt(vscode.l10n.t("Enter a name for the new Symfony Form"))
            .setInputValidator(new InputDefinitionNameValidator())
            .setInputProcessor(new InputSymfonyFormProcessor())
            .build();
    }
}
