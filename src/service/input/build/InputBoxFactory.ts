import * as vscode from "vscode";
import { InputBoxFileType } from "../type/InputBoxFileType";
import { InputBoxFactoryInterface } from "../interface/InputBoxFactoryInterface";
import { InputBoxInterface } from "../interface/InputInterface";
import { InputPhpFileNameProcessor } from "../processor/InputPhpFileNameProcessor";
import { InputDefinitionNameValidator } from "../validator/InputDefinitionNameValidator";
import { InputFileNameValidator } from "../validator/InputFileNameValidator";
import { InputBoxBuilder } from "./InputBoxBuilder";

/**
 * Factory for creating input boxes based on type
 * This class uses the Factory pattern to create different types of input boxes
 */
export class InputBoxFactory implements InputBoxFactoryInterface {
    /**
     * Map of factory methods for different input box types
     */
    private readonly creators: Record<InputBoxFileType, () => InputBoxInterface> = {
        [InputBoxFileType.File]: () => this.createFileInputBox(),
        [InputBoxFileType.Class]: () => this.createClassInputBox(),
        [InputBoxFileType.Interface]: () => this.createInterfaceInputBox(),
        [InputBoxFileType.Enum]: () => this.createEnumInputBox(),
        [InputBoxFileType.Trait]: () => this.createTraitInputBox(),
    };

    /**
     * Creates an input box for the specified type
     * @param type The type of input box to create
     * @returns An input box interface implementation
     * @throws Error if the specified type is not supported
     */
    public create(type: InputBoxFileType): InputBoxInterface {
        const creator = this.creators[type];
        if (!creator) {
            throw new Error(`Unknown input box type: ${type}`);
        }
        return creator();
    }

    /**
     * Creates an input box configured for PHP file creation
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
     * Creates an input box configured for PHP class creation
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
     * Creates an input box configured for PHP interface creation
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
     * Creates an input box configured for PHP enum creation
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
     * Creates an input box configured for PHP trait creation
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
