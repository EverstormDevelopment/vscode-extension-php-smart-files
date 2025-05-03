import path from "path";
import * as vscode from "vscode";
import { InputBoxFactoryInterface } from "../../service/input/interface/InputBoxFactoryInterface";
import { NamespaceResolver } from "../../service/namespace/NamespaceResolver";
import { SnippetFactoryInterface } from "../../service/snippet/interface/SnippetFactoryInterface";
import { UriFolderResolver } from "../../service/filesystem/uri/UriFolderResolver";
import { FileCreator } from "../../service/filesystem/file/FileCreator";
import { FileTypeEnum } from "../../utils/enum/FileTypeEnum";

export class FileGenerationCommand {
    constructor(
        private readonly uriFolderResolver: UriFolderResolver,
        private readonly inputBoxFactory: InputBoxFactoryInterface,
        private readonly fileCreator: FileCreator,
        private readonly namespaceResolver: NamespaceResolver,
        private readonly snippedFactory: SnippetFactoryInterface
    ) {}

    async execute(fileType: FileTypeEnum, uri?: vscode.Uri): Promise<void> {
        const targetFolder = await this.getTargetFolder(uri);
        if (!targetFolder) {
            vscode.window.showErrorMessage(vscode.l10n.t("No target folder selected or no workspace opened."));
            return;
        }

        const fileName = await this.getFileName(fileType);
        if (!fileName) {
            return;
        }

        const filePath = this.getFilePath(targetFolder, fileName);
        const isFileCreated = await this.createFile(filePath);
        if (!isFileCreated) {
            return;
        }

        const editor = await this.openFileInEditor(filePath);

        const identifier = this.getIdentifier(filePath);
        const namespace = await this.getNamespace(filePath);
        const snippet = this.getSnippet(fileType, identifier, namespace);

        await this.insertSnippet(editor, snippet);
    }

    private async getTargetFolder(uri?: vscode.Uri): Promise<vscode.Uri | undefined> {
        return this.uriFolderResolver.getTargetFolder(uri);
    }

    private async getFileName(fileType: FileTypeEnum): Promise<string | undefined> {
        const testDialog = this.inputBoxFactory.create(fileType);
        return testDialog.prompt();
    }

    private getFilePath(targetFolder: vscode.Uri, fileName: string): vscode.Uri {
        return vscode.Uri.joinPath(targetFolder, fileName);
    }

    private async createFile(filePath: vscode.Uri): Promise<boolean> {
        try {
            await this.fileCreator.create(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    private async getNamespace(filePath: vscode.Uri): Promise<string | undefined> {
        return this.namespaceResolver.resolve(filePath);
    }

    private getIdentifier(filePath: vscode.Uri): string {
        const baseName = path.basename(filePath.toString());
        return path.parse(baseName).name;
    }

    private getSnippet(
        fileType: FileTypeEnum,
        identifier: string,
        namespace: string | undefined
    ): vscode.SnippetString {
        return this.snippedFactory.create(fileType, identifier, namespace);
    }

    private async openFileInEditor(filePath: vscode.Uri): Promise<vscode.TextEditor> {
        const document = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(document);

        const existingDocument = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === filePath.fsPath);
        if (existingDocument) {
            await vscode.commands.executeCommand("workbench.action.files.revert", existingDocument.uri);
        }

        return editor;
    }

    private async insertSnippet(editor: vscode.TextEditor, snippet: vscode.SnippetString): Promise<void> {
        editor.insertSnippet(snippet, new vscode.Position(0, 0));
    }
}
