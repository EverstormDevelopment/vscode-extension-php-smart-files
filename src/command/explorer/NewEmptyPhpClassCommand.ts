import * as vscode from "vscode";
import { UriFolderResolver } from "../../service/filesystem/UriFolderResolver";
import { InputBoxTypeEnum } from "../../service/input/enum/InputBoxTypeEnum";
import { InputBoxFactoryInterface } from "../../service/input/interface/InputBoxFactoryInterface";
import { ExplorerCommandInterface } from "../interface/ExplorerCommandInterface";
import { FileCreator } from "../../service/filesystem/FileCreator";
import { ComposerJsonService } from "../../service/composer/ComposerJsonService";
import { NamespaceResolver } from "../../service/namespace/NamespaceResolver";

/**
 * Command to create a new PHP class file
 */
export class NewEmptyPhpClassCommand implements ExplorerCommandInterface {
    /**
     * Constructor for NewEmptyPhpClassCommand
     * @param uriFolderResolver The URI folder resolver service
     */
    constructor(
        private readonly uriFolderResolver: UriFolderResolver,
        private readonly inputBoxFactory: InputBoxFactoryInterface,
        private readonly fileCreator: FileCreator,
        private readonly namespaceResolver: NamespaceResolver
    ) {}

    /**
     * Execute the command to create a new PHP class file
     * @param uri The URI from the command execution context
     */
    async execute(uri?: vscode.Uri): Promise<void> {
        // Determine the target folder based on context
        const targetFolder = await this.uriFolderResolver.getTargetFolder(uri);
        if (!targetFolder) {
            vscode.window.showErrorMessage(vscode.l10n.t("No target folder selected or no workspace opened."));
            return;
        }

        const testDialog = this.inputBoxFactory.create(InputBoxTypeEnum.File);
        const fileName = await testDialog.prompt();
        if (!fileName) {
            return;
        }

        const filePath = vscode.Uri.joinPath(targetFolder, fileName);
        try {
            await this.fileCreator.create(filePath);
        } catch (error) {
            return;
        }

        const foo = await this.namespaceResolver.resolve(filePath);
        console.log("Namespace: ", foo);
        
    }
}
