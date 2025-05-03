import * as vscode from "vscode";
import { ExplorerCommandInterface } from "../interface/ExplorerCommandInterface";

/**
 * Command to create a new empty PHP file
 */
export class NewEmptyPhpFileCommand implements ExplorerCommandInterface {

    constructor() {}

    async execute(uri?: vscode.Uri): Promise<void> {
        

    }
}
