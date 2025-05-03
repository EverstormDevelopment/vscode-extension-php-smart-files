import { FileGenerator } from './../../service/file/generator/model/FileGenerator';
import path from "path";
import * as vscode from "vscode";
import { UriFolderResolver } from "../../service/uri/UriFolderResolver";
import { InputBoxFileType } from "../../service/input/type/InputBoxFileType";
import { InputBoxFactoryInterface } from "../../service/input/interface/InputBoxFactoryInterface";
import { NamespaceResolver } from "../../service/namespace/NamespaceResolver";
import { SnippetClassFactory } from "../../service/snippet/build/SnippetClassFactory";
import { ExplorerCommandInterface } from "../interface/ExplorerCommandInterface";
import { SnippetFactory } from "../../service/snippet/build/SnippetFactory";
import { SnippetFactoryFileType } from "../../service/snippet/type/SnippetFactoryFileType";
import { FileCreator } from "../../service/file/creator/FileCreator";

/**
 * Command to create a new PHP class file
 */
export class NewEmptyPhpClassCommand implements ExplorerCommandInterface {
    /**
     * Constructor for NewEmptyPhpClassCommand
     * @param uriFolderResolver The URI folder resolver service
     */
    constructor(
        private readonly fileGenerator: FileGenerator,
    ) {}

    /**
     * Execute the command to create a new PHP class file
     * @param uri The URI from the command execution context
     */
    async execute(uri?: vscode.Uri): Promise<void> {
        this.fileGenerator.execute(uri);
    }
}
