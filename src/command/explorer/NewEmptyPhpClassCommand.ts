import { FileTypeEnum } from './../../utils/enum/FileTypeEnum';
import * as vscode from "vscode";
import { ExplorerCommandInterface } from "../interface/ExplorerCommandInterface";
import { FileGenerator } from '../../service/file/generator/FileGenerator';

/**
 * Command to create a new PHP class file
 */
export class NewEmptyPhpClassCommand implements ExplorerCommandInterface {

    constructor(
        private readonly fileGenerator: FileGenerator,
    ) {}

    async execute(uri?: vscode.Uri): Promise<void> {
        this.fileGenerator.execute(FileTypeEnum.Class, uri);
    }
}
