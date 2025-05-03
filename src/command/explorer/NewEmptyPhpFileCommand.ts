import * as vscode from "vscode";
import { ComposerJsonService } from "../../service/composer/ComposerJsonService";
import { UriFolderResolver } from "../../service/uri/UriFolderResolver";
import { InputBoxTypeEnum } from "../../service/input/enum/InputBoxTypeEnum";
import { ExplorerCommandInterface } from "../interface/ExplorerCommandInterface";
import { InputBoxFactoryInterface } from './../../service/input/interface/InputBoxFactoryInterface';
import { FileCreator } from "../../service/file/creator/FileCreator";

/**
 * Command to create a new empty PHP file
 */
export class NewEmptyPhpFileCommand implements ExplorerCommandInterface {

    constructor() {}

    async execute(uri?: vscode.Uri): Promise<void> {
        

    }
}
