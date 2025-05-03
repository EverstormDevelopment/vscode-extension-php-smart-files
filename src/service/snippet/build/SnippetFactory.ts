import * as vscode from "vscode";
import { SnippetFactoryFileType } from '../type/SnippetFactoryFileType';
import { SnippetTypeFactoryInterface } from '../interface/SnippetTypeFactoryInterface';
import { SnippetFactoryInterface } from '../interface/SnippetFactoryInterface';
import { SnippetClassFactory } from './SnippetClassFactory';

/**
 * Factory class for creating PHP snippets.
 * Delegates to specific factories based on the requested PHP element type.
 */
export class SnippetFactory implements SnippetFactoryInterface {

    /**
     * Registry of factory functions for different PHP snippet types
     */
    private readonly factories: Record<SnippetFactoryFileType, () => SnippetTypeFactoryInterface> = {
        [SnippetFactoryFileType.File]: () => new SnippetClassFactory(),
        [SnippetFactoryFileType.Class]: () => new SnippetClassFactory(),
        [SnippetFactoryFileType.Interface]: () => new SnippetClassFactory(),
        [SnippetFactoryFileType.Enum]: () => new SnippetClassFactory(),
        [SnippetFactoryFileType.Trait]: () => new SnippetClassFactory(),
    };

    /**
     * Creates a PHP snippet based on the specified type, identifier and namespace
     * @param type - The type of PHP element to create
     * @param identifier - The name of the PHP definition
     * @param namespace - Optional namespace for the PHP definition
     * @returns A VS Code snippet string
     * @throws Error if an unknown snippet factory type is provided
     */
    public create(type: SnippetFactoryFileType, identifier: string, namespace?: string): vscode.SnippetString {
        if(!this.factories[type]) {
            throw new Error(`Unknown snippet factory type: ${type}`);
        }

        const factory = this.factories[type]();
        return factory.create(identifier, namespace);
    }
}