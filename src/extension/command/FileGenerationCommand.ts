import * as vscode from "vscode";
import { FileCreator } from "../../service/filesystem/file/model/FileCreator";
import { UriFolderResolver } from "../../service/filesystem/uri/UriFolderResolver";
import { InputBoxFactoryInterface } from "../../service/input/interface/InputBoxFactoryInterface";
import { NamespaceResolver } from "../../service/namespace/model/NamespaceResolver";
import { SnippetFactoryInterface } from "../../service/snippet/interface/SnippetFactoryInterface";
import { FileTypeEnum } from "../../utils/enum/FileTypeEnum";
import { getUriFileName } from "../../utils/filesystem/getUriFileName";
import { findDocumentByUri } from "../../utils/vscode/findDocumentByUri";

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
            vscode.window.showWarningMessage(vscode.l10n.t("No target folder selected or no workspace opened."));
            return;
        }

        const fileName = await this.getFileName(fileType);
        if (!fileName) {
            return;
        }

        const fileUri = this.getFileUri(targetFolder, fileName);
        const isFileCreated = await this.createFile(fileUri);
        if (!isFileCreated) {
            return;
        }

        const editor = await this.openFileInEditor(fileUri);

        const identifier = getUriFileName(fileUri);
        const namespace = await this.getNamespace(fileUri);
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
     * Constructs the full URI for the new file by combining the target folder and filename
     * @param targetFolder The folder URI where the file will be created
     * @param fileName The name of the file to create
     * @returns The complete URI for the new file
     */
    private getFileUri(targetFolder: vscode.Uri, fileName: string): vscode.Uri {
        return vscode.Uri.joinPath(targetFolder, fileName);
    }

    /**
     * Creates an empty file at the specified URI
     * @param uri The URI where to create the file
     * @returns Promise resolving to true if file was created successfully, false otherwise
     */
    private async createFile(uri: vscode.Uri): Promise<boolean> {
        try {
            await this.fileCreator.create(uri);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Resolves the appropriate namespace for the file based on its location
     * @param uri The URI of the file
     * @returns Promise resolving to the namespace string or undefined if namespace cannot be determined
     */
    private async getNamespace(uri: vscode.Uri): Promise<string | undefined> {
        try {
            return await this.namespaceResolver.resolve(uri);
        } catch (error) {
            const message = vscode.l10n.t(
                "Namespace skipped: The detected namespace was invalid due to invalid names in the directory structure."
            );
            vscode.window.showWarningMessage(message);
            return undefined;
        }
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
     * Opens the newly created file in the editor and ensures it's in a clean state
     * @param uri The URI of the file to open
     * @returns Promise resolving to the TextEditor for the opened file
     */
    private async openFileInEditor(uri: vscode.Uri): Promise<vscode.TextEditor> {
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);

        const existingDocument = findDocumentByUri(document.uri);
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
