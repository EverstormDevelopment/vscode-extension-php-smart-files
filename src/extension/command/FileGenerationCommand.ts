import * as vscode from "vscode";
import { FileCreator } from "../../service/filesystem/file/model/FileCreator";
import { UriFolderResolver } from "../../service/filesystem/uri/UriFolderResolver";
import { InputBoxFactoryInterface } from "../../service/input/interface/InputBoxFactoryInterface";
import { NamespaceResolver } from "../../service/namespace/resolver/NamespaceResolver";
import { SnippetFactoryInterface } from "../../service/snippet/interface/SnippetFactoryInterface";
import { getUriFileName } from "../../utils/filesystem/getUriFileName";
import { FileTypeEnum } from "../../utils/php/enum/FileTypeEnum";
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

        await this.applySnippet(fileUri, fileType);
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
     * Applies a code snippet to the file based on file type and saves it
     * @param uri The URI of the file to apply the snippet to
     * @param fileType The type of PHP file determining which snippet to apply
     */
    private async applySnippet(uri: vscode.Uri, fileType: FileTypeEnum): Promise<void> {
        const snippet = await this.createSnippet(uri, fileType);
        await this.saveSnippet(uri, snippet);
    }

    /**
     * Creates a snippet based on file type, identifier and namespace
     * @param uri The URI of the file to create a snippet for
     * @param fileType The type of PHP file determining the snippet template
     * @returns Promise resolving to the snippet content
     */
    private async createSnippet(uri: vscode.Uri, fileType: FileTypeEnum): Promise<vscode.SnippetString> {
        const identifier = getUriFileName(uri);
        const namespace = await this.getNamespace(uri);
        return this.snippedFactory.create(fileType, identifier, namespace);
    }

    /**
     * Saves a snippet to the specified file and ensures it is saved to disk
     * @param uri The URI of the file to save the snippet to
     * @param snippet The snippet content to insert into the file
     */
    private async saveSnippet(uri: vscode.Uri, snippet: vscode.SnippetString): Promise<void> {
        const editor = await this.openFileInEditor(uri);
        await editor.insertSnippet(snippet, new vscode.Position(0, 0));
        await editor.document.save();
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
}
