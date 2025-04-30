import * as vscode from "vscode";
import { UriFolderResolver } from "../../service/filesystem/UriFolderResolver";
import { InputBoxTypeEnum } from "../../service/input/enum/InputBoxTypeEnum";
import { ExplorerCommandInterface } from "../interface/ExplorerCommandInterface";
import { InputBoxFactoryInterface } from './../../service/input/interface/InputBoxFactoryInterface';
import { FileCreator } from "../../service/filesystem/FileCreator";

/**
 * Command to create a new empty PHP file
 */
export class NewEmptyPhpFileCommand implements ExplorerCommandInterface {
    /**
     * Constructor for NewEmptyPhpFileCommand
     * @param uriFolderResolver The URI folder resolver service
     */
    constructor(
        private readonly uriFolderResolver: UriFolderResolver,
        private readonly inputBoxFactory: InputBoxFactoryInterface,
        private readonly fileCreator: FileCreator,
    ) {}

    /**
     * Execute the command to create a new empty PHP file
     * @param uri The URI from the command execution context
     */
    async execute(uri?: vscode.Uri): Promise<void> {
        // Determine the target folder based on context
        const targetFolder = this.uriFolderResolver.getTargetFolder(uri);
        if (!targetFolder) {
            vscode.window.showErrorMessage(vscode.l10n.t("No target folder selected or no workspace opened."));
            return;
        }

        const testDialog = this.inputBoxFactory.create(InputBoxTypeEnum.File);
        const fileName = await testDialog.prompt();
        if (!fileName) {
            return;
        }

  
        // Create path for the new file
        const filePath = vscode.Uri.joinPath(targetFolder, fileName);
        try {
            this.fileCreator.create(filePath);
        } catch (error) {
            return;
        }


    }
}
