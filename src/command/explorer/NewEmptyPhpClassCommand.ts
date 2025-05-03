import path from "path";
import * as vscode from "vscode";
import { FileCreator } from "../../service/filesystem/FileCreator";
import { UriFolderResolver } from "../../service/filesystem/UriFolderResolver";
import { InputBoxTypeEnum } from "../../service/input/enum/InputBoxTypeEnum";
import { InputBoxFactoryInterface } from "../../service/input/interface/InputBoxFactoryInterface";
import { NamespaceResolver } from "../../service/namespace/NamespaceResolver";
import { PhpSnippetClassFactory } from "../../service/snippet/build/PhpSnippetClassFactory";
import { ExplorerCommandInterface } from "../interface/ExplorerCommandInterface";
import { PhpSnippetFactory } from "../../service/snippet/build/PhpSnippetFactory";
import { PhpSnippetFactoryTypeEnum } from "../../service/snippet/enum/PhpSnippetFactoryTypeEnum";

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
        console.log("Namespace: ", typeof foo);

        const baseName = path.basename(filePath.toString());
        const name = path.parse(baseName).name;

        const classFactory = new PhpSnippetFactory();
        const snippet = classFactory.create(PhpSnippetFactoryTypeEnum.Class, name, foo);

        // Open the file in the editor
        const document = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(document);

        // Prüfe, ob die Datei bereits geöffnet ist
        const existingDocument = vscode.workspace.textDocuments.find(doc => 
            doc.uri.fsPath === filePath.fsPath);
            
        if (existingDocument) {
            // Wenn die Datei bereits geöffnet ist, lade den Inhalt neu
            await vscode.commands.executeCommand('workbench.action.files.revert', existingDocument.uri);
        }
        
        
        // Insert the snippet at the beginning of the document
        await editor.insertSnippet(snippet, new vscode.Position(0, 0));
        
        
    }
}
