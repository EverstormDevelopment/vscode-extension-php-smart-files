import path from "path";
import * as vscode from "vscode";
import { escapeRegExp } from "../../../utils/regex/escapeRegExp";
import { NamespaceResolver } from "../../namespace/NamespaceResolver";

/**
 * Handles refactoring operations related to PHP namespaces
 */
export class NamespaceRefactorer {
    /**
     * Initializes the NamespaceRefactorer with a NamespaceResolver
     * @param namespaceResolver Resolves namespaces for given file URIs
     */
    constructor(private readonly namespaceResolver: NamespaceResolver) {}

    /**
     * Updates the namespace in the specified file and all references
     * to that namespace in other files.
     * @param oldUri The URI of the original file
     * @param newUri The URI of the new file
     */
    public async updateFileAndReferences(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const oldNamespace = await this.namespaceResolver.resolve(oldUri);
        const newNamespace = await this.namespaceResolver.resolve(newUri);
        const identifier = path.parse(newUri.fsPath).name;
        if (!oldNamespace || !newNamespace || oldNamespace === newNamespace) {
            return;
        }

        const updatedFile = await this.updateFile(newUri, newNamespace);
        if (!updatedFile) {
            return;
        }

        await this.updateReferences(`${oldNamespace}\\${identifier}`, `${newNamespace}\\${identifier}`);
    }

    /**
     * Updates the namespace declaration in a single file.
     * @param uri The URI of the file to update
     * @param namespace The new namespace to set
     * @returns True if the file was updated, false otherwise
     */
    public async updateFile(uri: vscode.Uri, namespace: string): Promise<boolean> {
        try {
            const fileContent = await this.getFileContent(uri);
            const updatedContent = this.replaceNamespace(fileContent, namespace);
            if (!updatedContent) {
                return false;
            }

            await this.updateFileContent(uri, updatedContent);
            return true;
        } catch (error) {
            const errorDetails = error instanceof Error ? error.message : String(error);
            const errorMessage = vscode.l10n.t("Error during namespace refactoring: {0}", errorDetails);
            vscode.window.showErrorMessage(errorMessage);
            return false;
        }
    }

    /**
     * Updates all references to the old namespace with the new namespace across the project.
     * @param oldNamespace The original namespace to be replaced
     * @param newNamespace The new namespace to replace with
     */
    public async updateReferences(oldNamespace: string, newNamespace: string): Promise<void> {
        const notificationMessage = vscode.l10n.t(
            'Updating references from "{0}" to "{1}"',
            oldNamespace,
            newNamespace
        );
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: notificationMessage,
                cancellable: false,
            },
            async (progress) => {
                const files = await this.findFilesToRefactor();
                const progressIncrement = 100 / files.length;

                for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
                    const processMessage = vscode.l10n.t("Processing file {0} of {1}", fileIndex + 1, files.length);
                    progress.report({
                        increment: progressIncrement,
                        message: processMessage,
                    });

                    await this.updateReference(files[fileIndex], oldNamespace, newNamespace);
                }
            }
        );
    }

    /**
     * Updates namespace references in a single file.
     * @param uri The file URI to process
     * @param oldNamespace The original namespace to be replaced
     * @param newNamespace The new namespace to replace with
     */
    private async updateReference(uri: vscode.Uri, oldNamespace: string, newNamespace: string): Promise<void> {
        try {
            const fileContent = await this.getFileContent(uri);
            if (!fileContent.includes(oldNamespace)) {
                return;
            }

            let fileContentUpdated = fileContent;
            fileContentUpdated = this.replaceUseStatement(fileContentUpdated, oldNamespace, newNamespace);
            fileContentUpdated = this.replaceFullyQualified(fileContentUpdated, oldNamespace, newNamespace);
            if (fileContentUpdated === fileContent) {
                return;
            }

            await this.updateFileContent(uri, fileContentUpdated);
        } catch (error) {
            const errorDetails = error instanceof Error ? error.message : String(error);
            const errorMessage = vscode.l10n.t("Error updating references in file {0}: {1}", uri.fsPath, errorDetails);
            vscode.window.showErrorMessage(errorMessage);
        }
    }

    /**
     * Retrieves the content of a file, either from an open editor or by reading from disk.
     * @param uri The URI of the file to read
     * @returns The content of the file as a string
     */
    private async getFileContent(uri: vscode.Uri): Promise<string> {
        const editor = this.findOpenEditor(uri);
        if (editor) {
            return editor.document.getText();
        }

        const fileContent = await vscode.workspace.fs.readFile(uri);
        return fileContent.toString();
    }

    /**
     * Replaces the namespace declaration in the given file content.
     * @param content The content of the file
     * @param namespace The new namespace to set
     * @returns The updated content, or undefined if no namespace declaration was found
     */
    private replaceNamespace(content: string, namespace: string): string | undefined {
        const namespaceRegex = /[^\r\n]*namespace\s+[\w\\]+;/m;
        const match = content.match(namespaceRegex);
        if (!match) {
            return undefined;
        }

        return content.replace(namespaceRegex, `namespace ${namespace};`);
    }

    /**
     * Replaces `use` statements for the old namespace with the new namespace.
     * @param content The content of the file
     * @param oldNamespace The original namespace to be replaced
     * @param newNamespace The new namespace to replace with
     * @returns The updated content
     */
    private replaceUseStatement(content: string, oldNamespace: string, newNamespace: string): string {
        const useRegex = new RegExp(`use\\s+${escapeRegExp(oldNamespace)}\s*;`, "g");
        return content.replace(useRegex, (match, suffix) => {
            return `use ${newNamespace};`;
        });
    }

    /**
     * Replaces fully qualified class names for the old namespace with the new namespace.
     * @param content The content of the file
     * @param oldNamespace The original namespace to be replaced
     * @param newNamespace The new namespace to replace with
     * @returns The updated content
     */
    private replaceFullyQualified(content: string, oldNamespace: string, newNamespace: string): string {
        const fqcnRegex = new RegExp(`\\b${escapeRegExp(oldNamespace)}`, "g");
        return content.replace(fqcnRegex, () => {
            return `${newNamespace}`;
        });
    }

    /**
     * Updates the content of a file, either in an open editor or directly on disk.
     * @param uri The URI of the file to update
     * @param content The new content to write to the file
     */
    private async updateFileContent(uri: vscode.Uri, content: string): Promise<void> {
        const openEditor = this.findOpenEditor(uri);
        if (!openEditor) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
            return;
        }

        const isDirty = openEditor.document.isDirty;

        const fullRange = new vscode.Range(
            openEditor.document.positionAt(0),
            openEditor.document.positionAt(openEditor.document.getText().length)
        );

        await openEditor.edit((editBuilder) => {
            editBuilder.replace(fullRange, content);
        });

        if (!isDirty) {
            await openEditor.document.save();
        }
    }

    /**
     * Finds an open editor for the specified file URI, if one exists.
     * @param uri The URI of the file to find
     * @returns The open editor, or undefined if no editor is open for the file
     */
    private findOpenEditor(uri: vscode.Uri): vscode.TextEditor | undefined {
        return vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === uri.toString());
    }

    /**
     * Finds all PHP files in the workspace, excluding certain folders.
     * @returns A list of URIs for the PHP files to refactor
     */
    private async findFilesToRefactor(): Promise<vscode.Uri[]> {
        const excludedFolders = ["vendor", "node_modules"];
        const excludePattern = `{${excludedFolders.map((folder) => folder + "/**").join(",")}}`;
        const phpFiles = await vscode.workspace.findFiles("**/*.php", excludePattern);
        return phpFiles;
    }
}
