import * as vscode from "vscode";
import { PhpSnippetFactoryTypeEnum } from '../enum/PhpSnippetFactoryTypeEnum';
import { PhpSnippetTypeFactoryInterface } from '../interface/PhpSnippetTypeFactoryInterface';
import { PhpSnippetFactoryInterface } from '../interface/PhpSnippetFactoryInterface';
import { PhpSnippetClassFactory } from './PhpSnippetClassFactory';

export class PhpSnippetFactory implements PhpSnippetFactoryInterface {

    private readonly factories: Record<PhpSnippetFactoryTypeEnum, () => PhpSnippetTypeFactoryInterface> = {
        [PhpSnippetFactoryTypeEnum.File]: () => new PhpSnippetClassFactory(),
        [PhpSnippetFactoryTypeEnum.Class]: () => new PhpSnippetClassFactory(),
        [PhpSnippetFactoryTypeEnum.Interface]: () => new PhpSnippetClassFactory(),
        [PhpSnippetFactoryTypeEnum.Enum]: () => new PhpSnippetClassFactory(),
        [PhpSnippetFactoryTypeEnum.Trait]: () => new PhpSnippetClassFactory(),
    };

    public create(type: PhpSnippetFactoryTypeEnum, identifier: string, namespace?: string): vscode.SnippetString {
        if(!this.factories[type]) {
            throw new Error(`Unknown snippet factory type: ${type}`);
        }

        const factory = this.factories[type]();
        return factory.create(identifier, namespace);
    }
}