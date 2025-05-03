import path from "path";
import * as vscode from "vscode";
import { FileCreator } from "../../service/filesystem/file/FileCreator";
import { UriFolderResolver } from "../../service/filesystem/uri/UriFolderResolver";
import { InputBoxFactoryInterface } from "../../service/input/interface/InputBoxFactoryInterface";
import { NamespaceResolver } from "../../service/namespace/NamespaceResolver";
import { SnippetFactoryInterface } from "../../service/snippet/interface/SnippetFactoryInterface";
import { FileTypeEnum } from "../../utils/enum/FileTypeEnum";

/**
 * Command handler for creating new PHP files of various types.
 * Orchestrates the entire file creation process from selecting a folder
 * to generating the file with the appropriate content.
 */
export class FileGenerationCommand {
    /**
     * Creates a new FileGenerationCommand instance.
     * @param uriFolderResolver Service for resolving target folders
     * @param inputBoxFactory Factory for creating input dialogs based on file type
     * @param fileCreator Service for creating files in the workspace
     * @param namespaceResolver Service for resolving PHP namespaces
     * @param snippedFactory Factory for creating PHP code snippets
     */
    constructor(
        private readonly uriFolderResolver: UriFolderResolver,
        private readonly inputBoxFactory: InputBoxFactoryInterface,
        private readonly fileCreator: FileCreator,
        private readonly namespaceResolver: NamespaceResolver,
        private readonly snippedFactory: SnippetFactoryInterface
    ) {}

    /**
     * Executes the file generation process.
     * @param fileType The type of PHP file to create
     * @param uri Optional URI indicating where to create the file
     * @returns Promise that resolves when the process completes
     */
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

    /**
     * Gets the target folder for file creation.
     * @param uri Optional URI to determine the target folder
     * @returns Promise resolving to the target folder URI or undefined
     */
    private async getTargetFolder(uri?: vscode.Uri): Promise<vscode.Uri | undefined> {
        return this.uriFolderResolver.getTargetFolder(uri);
    }

    /**
     * Prompts the user for a filename based on the file type.
     * @param fileType The type of PHP file to create
     * @returns Promise resolving to the entered filename or undefined if canceled
     */
    private async getFileName(fileType: FileTypeEnum): Promise<string | undefined> {
        const testDialog = this.inputBoxFactory.create(fileType);
        return testDialog.prompt();
    }

    /**
     * Constructs the full file path from a target folder and filename.
     * @param targetFolder The folder URI where the file will be created
     * @param fileName The name of the file to create
     * @returns The complete file URI
     */
    private getFilePath(targetFolder: vscode.Uri, fileName: string): vscode.Uri {
        return vscode.Uri.joinPath(targetFolder, fileName);
    }

    /**
     * Creates a new file at the specified path.
     * @param filePath The URI where the file should be created
     * @returns Promise resolving to true if successful, false otherwise
     */
    private async createFile(filePath: vscode.Uri): Promise<boolean> {
        try {
            await this.fileCreator.create(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Resolves the PHP namespace for the given file path.
     * @param filePath The URI of the file to get a namespace for
     * @returns Promise resolving to the namespace or undefined if not determinable
     */
    private async getNamespace(filePath: vscode.Uri): Promise<string | undefined> {
        return this.namespaceResolver.resolve(filePath);
    }

    /**
     * Extracts the identifier (class/interface/enum name) from a file path.
     * @param filePath The URI of the file
     * @returns The identifier extracted from the filename (without extension)
     */
    private getIdentifier(filePath: vscode.Uri): string {
        const baseName = path.basename(filePath.toString());
        return path.parse(baseName).name;
    }

    /**
     * Creates a code snippet for the specified file type and identifier.
     * @param fileType The type of PHP file to create
     * @param identifier The identifier (class/interface/enum name)
     * @param namespace Optional namespace for the PHP element
     * @returns A VS Code snippet string representing the PHP code
     */
    private getSnippet(
        fileType: FileTypeEnum,
        identifier: string,
        namespace: string | undefined
    ): vscode.SnippetString {
        return this.snippedFactory.create(fileType, identifier, namespace);
    }

    /**
     * Opens the file in VS Code's editor.
     * @param filePath The URI of the file to open
     * @returns Promise resolving to the TextEditor instance
     */
    private async openFileInEditor(filePath: vscode.Uri): Promise<vscode.TextEditor> {
        const document = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(document);

        const existingDocument = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === filePath.fsPath);
        if (existingDocument) {
            await vscode.commands.executeCommand("workbench.action.files.revert", existingDocument.uri);
        }

        return editor;
    }

    /**
     * Inserts a snippet at the beginning of the file.
     * @param editor The TextEditor where the snippet will be inserted
     * @param snippet The snippet to insert
     * @returns Promise resolving when the insertion is complete
     */
    private async insertSnippet(editor: vscode.TextEditor, snippet: vscode.SnippetString): Promise<void> {
        editor.insertSnippet(snippet, new vscode.Position(0, 0));
    }
}
