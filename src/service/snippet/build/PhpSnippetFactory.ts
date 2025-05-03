import * as vscode from "vscode";
import { PhpSnippetFactoryTypeEnum } from '../enum/PhpSnippetFactoryTypeEnum';
import { PhpSnippetTypeFactoryInterface } from '../interface/PhpSnippetTypeFactoryInterface';
import { PhpSnippetFactoryInterface } from '../interface/PhpSnippetFactoryInterface';
import { PhpSnippetClassFactory } from './PhpSnippetClassFactory';

/**
 * Factory class for creating PHP snippets.
 * Delegates to specific factories based on the requested PHP element type.
 */
export class PhpSnippetFactory implements PhpSnippetFactoryInterface {

    /**
     * Registry of factory functions for different PHP snippet types
     */
    private readonly factories: Record<PhpSnippetFactoryTypeEnum, () => PhpSnippetTypeFactoryInterface> = {
        [PhpSnippetFactoryTypeEnum.File]: () => new PhpSnippetClassFactory(),
        [PhpSnippetFactoryTypeEnum.Class]: () => new PhpSnippetClassFactory(),
        [PhpSnippetFactoryTypeEnum.Interface]: () => new PhpSnippetClassFactory(),
        [PhpSnippetFactoryTypeEnum.Enum]: () => new PhpSnippetClassFactory(),
        [PhpSnippetFactoryTypeEnum.Trait]: () => new PhpSnippetClassFactory(),
    };

    /**
     * Creates a PHP snippet based on the specified type, identifier and namespace
     * @param type - The type of PHP element to create
     * @param identifier - The name of the PHP definition
     * @param namespace - Optional namespace for the PHP definition
     * @returns A VS Code snippet string
     * @throws Error if an unknown snippet factory type is provided
     */
    public create(type: PhpSnippetFactoryTypeEnum, identifier: string, namespace?: string): vscode.SnippetString {
        if(!this.factories[type]) {
            throw new Error(`Unknown snippet factory type: ${type}`);
        }

        const factory = this.factories[type]();
        return factory.create(identifier, namespace);
    }
}