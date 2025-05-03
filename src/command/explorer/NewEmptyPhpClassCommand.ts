import * as vscode from "vscode";
import { ExplorerCommandInterface } from "../interface/ExplorerCommandInterface";
import { FileGenerator } from '../../service/file/generator/FileGenerator';

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
