import * as vscode from "vscode";
import { FileTypeEnum } from "../../../utils/php/enum/FileTypeEnum";
import { SnippetFactoryInterface } from "../interface/SnippetFactoryInterface";
import { SnippetTypeFactoryInterface } from "../interface/SnippetTypeFactoryInterface";
import { SnippetClassFactory } from "./SnippetClassFactory";
import { SnippetEnumFactory } from "./SnippetEnumFactory";
import { SnippetFileFactory } from "./SnippetFileFactory";
import { SnippetInterfaceFactory } from "./SnippetInterfaceFactory";
import { SnippetSymfonyCommandFactory } from "./SnippetSymfonyCommandFactory";
import { SnippetSymfonyControllerFactory } from "./SnippetSymfonyControllerFactory";
import { SnippetSymfonyFormFactory } from "./SnippetSymfonyFormFactory";
import { SnippetTemplateClassFactory } from "./SnippetTemplateClassFactory";
import { SnippetTemplateEnumFactory } from "./SnippetTemplateEnumFactory";
import { SnippetTemplateInterfaceFactory } from "./SnippetTemplateInterfaceFactory";
import { SnippetTemplateTraitFactory } from "./SnippetTemplateTraitFactory";
import { SnippetTraitFactory } from "./SnippetTraitFactory";

/**
 * Factory class for creating PHP snippets.
 * Delegates to specific factories based on the requested PHP element type.
 */
export class SnippetFactory implements SnippetFactoryInterface {
    /**
     * Registry of factory functions for different PHP snippet types
     */
    private readonly factories: Record<FileTypeEnum, () => SnippetTypeFactoryInterface> = {
        [FileTypeEnum.File]: () => new SnippetFileFactory(),
        [FileTypeEnum.Class]: () => new SnippetClassFactory(),
        [FileTypeEnum.Interface]: () => new SnippetInterfaceFactory(),
        [FileTypeEnum.Enum]: () => new SnippetEnumFactory(),
        [FileTypeEnum.Trait]: () => new SnippetTraitFactory(),

        [FileTypeEnum.TemplateClass]: () => new SnippetTemplateClassFactory(),
        [FileTypeEnum.TemplateInterface]: () => new SnippetTemplateInterfaceFactory(),
        [FileTypeEnum.TemplateEnum]: () => new SnippetTemplateEnumFactory(),
        [FileTypeEnum.TemplateTrait]: () => new SnippetTemplateTraitFactory(),

        [FileTypeEnum.SymfonyController]: () => new SnippetSymfonyControllerFactory(),
        [FileTypeEnum.SymfonyCommand]: () => new SnippetSymfonyCommandFactory(),
        [FileTypeEnum.SymfonyForm]: () => new SnippetSymfonyFormFactory(),
    };

    /**
     * Creates a PHP snippet based on the specified type, identifier and namespace
     * @param type - The type of PHP element to create
     * @param identifier - The name of the PHP definition
     * @param namespace - Optional namespace for the PHP definition
     * @returns A VS Code snippet string
     * @throws Error if an unknown snippet factory type is provided
     */
    public create(type: FileTypeEnum, identifier: string, namespace?: string): vscode.SnippetString {
        if (!this.factories[type]) {
            throw new Error(`Unknown snippet factory type: ${type}`);
        }

        const factory = this.factories[type]();
        return factory.create(identifier, namespace);
    }
}
