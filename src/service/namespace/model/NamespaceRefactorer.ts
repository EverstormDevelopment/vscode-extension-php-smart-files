import path from "path";
import * as vscode from "vscode";
import { escapeRegExp } from "../../../utils/regex/escapeRegExp";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailType";
import { NamespaceResolver } from "./NamespaceResolver";

/**
 * Handles refactoring operations related to PHP namespaces.
 */
export class NamespaceRefactorer {
    /**
     * Initializes the NamespaceRefactorer with a NamespaceResolver.
     * @param namespaceResolver Resolves namespaces for given file URIs.
     */
    constructor(private readonly namespaceResolver: NamespaceResolver) {}

    /**
     * Updates the namespace in the specified file and all references
     * to that namespace in other files.
     * @param oldUri The URI of the original file.
     * @param newUri The URI of the new file.
     */
    public async updateFileAndReferences(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const updatedFile = await this.updateFile(oldUri, newUri);
        if (!updatedFile) {
            return;
        }

        await this.updateReferences(oldUri, newUri);
    }

    /**
     * Updates the namespace declaration in a single file.
     * @param oldUri The URI of the original file.
     * @param newUri The URI of the new file.
     * @returns True if the file was updated, false otherwise.
     */
    public async updateFile(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<boolean> {
        try {
            const refactorDetails = await this.getRefactorDetails(oldUri, newUri);
            if (!refactorDetails.oldNamespace || !refactorDetails.newNamespace) {
                return false;
            }

            const fileContent = await this.getFileContent(refactorDetails.newUri);
            const updatedContent = this.replaceNamespace(fileContent, refactorDetails.newNamespace);
            if (!updatedContent) {
                return false;
            }

            await this.updateFileContent(refactorDetails.newUri, updatedContent);
            return true;
        } catch (error) {
            const errorDetails = error instanceof Error ? error.message : String(error);
            const errorMessage = vscode.l10n.t("Error during namespace refactoring: {0}", errorDetails);
            vscode.window.showErrorMessage(errorMessage);
            return false;
        }
    }

    /**
     * Updates references to a namespace in other files.
     * @param oldDeclarationUri The URI of the old namespace declaration.
     * @param newDeclarationUri The URI of the new namespace declaration.
     */
    public async updateReferences(oldDeclarationUri: vscode.Uri, newDeclarationUri: vscode.Uri): Promise<void> {
        const refactorDetails = await this.getRefactorDetails(oldDeclarationUri, newDeclarationUri);
        if (!refactorDetails.oldNamespace || !refactorDetails.newNamespace) {
            return;
        }
        if (!refactorDetails.hasNamespaceChanged && !refactorDetails.hasIdentifierChanged) {
            return;
        }

        await this.progressUpdateReferences(refactorDetails);
    }

    /**
     * Updates references in multiple files with progress reporting.
     * @param refactorDetails The details of the namespace refactor.
     */
    private async progressUpdateReferences(refactorDetails: NamespaceRefactorDetailsType): Promise<void> {
        const options: vscode.ProgressOptions = {
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t(
                'Updating references from "{0}" to "{1}"',
                refactorDetails.oldNamespace,
                refactorDetails.newNamespace
            ),
        };

        await vscode.window.withProgress(options, async (progress) => {
            const files = await this.findFilesToRefactor();
            const progressIncrement = 100 / files.length;

            for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
                const progressMessage = vscode.l10n.t("Processing file {0} of {1}", fileIndex + 1, files.length);
                progress.report({
                    increment: progressIncrement,
                    message: progressMessage,
                });

                await this.updateReference(files[fileIndex], refactorDetails);
            }
        });
    }

    /**
     * Updates references in a file based on refactor details.
     * @param uri The URI of the file to update.
     * @param refactorDetails The details of the namespace refactor.
     */
    private async updateReference(uri: vscode.Uri, refactorDetails: NamespaceRefactorDetailsType): Promise<void> {
        try {
            const fileContent = await this.getFileContent(uri);
            const namespaceDecalrationRegex = this.getNamespaceDeclarationRegex();
            const namespaceDeclarationMatch = fileContent.match(namespaceDecalrationRegex);
            const fileNamespace = namespaceDeclarationMatch?.[1];
            if (!fileNamespace) {
                return;
            }

            let fileContentUpdated = fileContent;
            fileContentUpdated = await this.refactorFullyQualified(fileContentUpdated, fileNamespace, refactorDetails);
            fileContentUpdated = await this.refactorUseStatement(fileContentUpdated, fileNamespace, refactorDetails);
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
     * @param uri The URI of the file to read.
     * @returns The content of the file as a string.
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
     * @param content The content of the file.
     * @param namespace The new namespace to set.
     * @returns The updated content, or undefined if no namespace declaration was found.
     */
    private replaceNamespace(content: string, namespace: string): string | undefined {
        const namespaceRegex = this.getNamespaceDeclarationRegex();
        const hasMatch = namespaceRegex.test(content);
        if (!hasMatch) {
            return undefined;
        }

        return content.replace(namespaceRegex, `namespace ${namespace};`);
    }

    /**
     * Refactors fully qualified namespaces in content based on the file's namespace context.
     * @param content The content of the file to refactor.
     * @param fileNamespace The namespace of the file being refactored.
     * @param refactorDetails The details of the namespace refactoring operation.
     * @returns The updated content with refactored fully qualified namespaces.
     */
    private async refactorFullyQualified(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): Promise<string> {
        const oldFullyQualifiedNamespace = `\\${refactorDetails.oldNamespace}\\${refactorDetails.oldIdentifier}`;
        const newFullyQualifiedNamespace = `\\${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier}`;

        if (fileNamespace === refactorDetails.newNamespace) {
            return this.replaceFullyQualified(content, oldFullyQualifiedNamespace, refactorDetails.newIdentifier);
        }

        return this.replaceFullyQualified(content, oldFullyQualifiedNamespace, newFullyQualifiedNamespace);
    }

    /**
     * Replaces occurrences of a fully qualified namespace with a new one in the content.
     * @param content The content of the file to process.
     * @param oldFullyQualifiedNamespace The old fully qualified namespace to replace.
     * @param newFullyQualifiedNamespace The new fully qualified namespace to use as replacement.
     * @returns The updated content with replaced fully qualified namespaces.
     */
    private async replaceFullyQualified(
        content: string,
        oldFullyQualifiedNamespace: string,
        newFullyQualifiedNamespace: string
    ): Promise<string> {
        const fqcnRegex = this.getFullyQualifiedNamespaceRegex(oldFullyQualifiedNamespace);
        return content.replace(fqcnRegex, newFullyQualifiedNamespace);
    }

    /**
     * Refactors `use` statements in the given content based on the file namespace context.
     * @param content The content of the file to refactor.
     * @param fileNamespace The namespace of the file being refactored.
     * @param refactorDetails The details of the namespace refactoring operation.
     * @returns The updated content with refactored use statements.
     */
    private async refactorUseStatement(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): Promise<string> {
        if (fileNamespace === refactorDetails.oldNamespace) {
            return this.addUseStatement(content, refactorDetails);
        }

        if (fileNamespace === refactorDetails.newNamespace) {
            return this.removeUseStatement(content, refactorDetails);
        }

        return this.replaceUseStatement(content, refactorDetails);
    }

    /**
     * Replaces a `use` statement in the content with an updated version.
     * @param content The content of the file to refactor.
     * @param refactorDetails The details of the namespace refactoring operation.
     * @returns The updated content with replaced use statements.
     */
    private async replaceUseStatement(content: string, refactorDetails: NamespaceRefactorDetailsType): Promise<string> {
        const oldFullQualifiedNamespace = `${refactorDetails.oldNamespace}\\${refactorDetails.oldIdentifier}`;
        const newFullQualifiedNamespace = `${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier}`;
        const useRegex = this.getUseStatementRegex(oldFullQualifiedNamespace);
        return content.replace(useRegex, `use ${newFullQualifiedNamespace};`);
    }

    /**
     * Adds a `use` statement for the new namespace if the file contains references to the identifier.
     * @param content The content of the file to refactor.
     * @param refactorDetails The details of the namespace refactoring operation.
     * @returns The updated content with added use statements where necessary.
     */
    private async addUseStatement(content: string, refactorDetails: NamespaceRefactorDetailsType): Promise<string> {
        const fullQualifiedNamespace = `${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier}`;
        const hasUseStatementRegex = this.getUseStatementRegex(fullQualifiedNamespace);
        const hasIdentifierRegex = this.getIdentifierRegex(refactorDetails.newIdentifier);
        if (hasUseStatementRegex.test(content) || !hasIdentifierRegex.test(content)) {
            return content;
        }

        const namespaceDeclarationRegex = this.getNamespaceDeclarationRegex();
        const namespaceDeclarationMatch = content.match(namespaceDeclarationRegex);
        if (!namespaceDeclarationMatch) {
            return content;
        }

        const useStatement = `use ${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier};`;

        const lastUseStatementRegex = this.getLastUseStatementRegex();
        const lastUseStatementMatch = content.match(lastUseStatementRegex);
        if (lastUseStatementMatch) {
            const lastUseMatch = lastUseStatementMatch[lastUseStatementMatch.length - 1];
            return content.replace(lastUseMatch, `${lastUseMatch}\n${useStatement}`);
        }

        return content.replace(namespaceDeclarationMatch[0], `${namespaceDeclarationMatch[0]}\n\n${useStatement}`);
    }

    /**
     * Removes a `use` statement for the old namespace if it's no longer needed.
     * @param content The content of the file to refactor.
     * @param refactorDetails The details of the namespace refactoring operation.
     * @returns The updated content with removed use statements.
     */
    private async removeUseStatement(content: string, refactorDetails: NamespaceRefactorDetailsType): Promise<string> {
        const fullQualifiedNamespace = `${refactorDetails.oldNamespace}\\${refactorDetails.oldIdentifier}`;
        const useStatementRegex = this.getUseStatementRegex(fullQualifiedNamespace);
        const useStatementWithLineBreakRegex = new RegExp(
            `${useStatementRegex.source}\\s*?\\r?\\n?\\r?`,
            useStatementRegex.flags
        );

        return content.replace(useStatementWithLineBreakRegex, "");
    }

    /**
     * Updates the content of a file, either in an open editor or directly on disk.
     * @param uri The URI of the file to update.
     * @param content The new content to write to the file.
     */
    private async updateFileContent(uri: vscode.Uri, content: string): Promise<void> {
        const openEditor = this.findOpenEditor(uri);
        if (!openEditor) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
            return;
        }

        const wasDirty = openEditor.document.isDirty;
        const fullRange = new vscode.Range(
            openEditor.document.positionAt(0),
            openEditor.document.positionAt(openEditor.document.getText().length)
        );

        await openEditor.edit((editBuilder) => {
            editBuilder.replace(fullRange, content);
        });

        if (!wasDirty) {
            await openEditor.document.save();
        }
    }

    /**
     * Finds an open editor for the specified file URI, if one exists.
     * @param uri The URI of the file to find.
     * @returns The open editor, or undefined if no editor is open for the file.
     */
    private findOpenEditor(uri: vscode.Uri): vscode.TextEditor | undefined {
        return vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === uri.toString());
    }

    /**
     * Retrieves PHP files in the workspace, excluding specified folders.
     * @returns A list of URIs for the PHP files to refactor.
     */
    private async findFilesToRefactor(): Promise<vscode.Uri[]> {
        const config = vscode.workspace.getConfiguration("phpFileCreator");
        const excludedFolders = config.get<string[]>("refactorNamespacesExcludeDirectories", []);
        const excludePattern = `{${excludedFolders.map((folder) => folder).join(",")}}`;
        const phpFiles = await vscode.workspace.findFiles("**/*.php", excludePattern);
        return phpFiles;
    }

    /**
     * Retrieves details about the namespace refactor operation.
     * @param oldUri The URI of the old file.
     * @param newUri The URI of the new file.
     * @returns An object containing details about the refactor operation.
     */
    private async getRefactorDetails(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<NamespaceRefactorDetailsType> {
        const oldNamespace = await this.namespaceResolver.resolve(oldUri);
        const newNamespace = await this.namespaceResolver.resolve(newUri);
        const oldIdentifier = path.parse(oldUri.fsPath).name;
        const newIdentifier = path.parse(newUri.fsPath).name;

        return {
            oldUri: oldUri,
            newUri: newUri,
            oldIdentifier: oldIdentifier,
            newIdentifier: newIdentifier,
            oldNamespace: oldNamespace || "",
            newNamespace: newNamespace || "",
            hasNamespaceChanged: oldNamespace !== newNamespace,
            hasIdentifierChanged: oldIdentifier !== newIdentifier,
        };
    }

    /**
     * Returns a regular expression to match namespace declarations.
     * @returns A regular expression to match namespace declarations.
     */
    private getNamespaceDeclarationRegex(): RegExp {
        return new RegExp(/[^\r\n\s]*namespace\s+([\p{L}\d_\\]+)\s*;/mu);
    }

    /**
     * Returns a regular expression to match fully qualified namespace names.
     * @param fullyQualifiedNamespace The fully qualified namespace to match.
     * @returns A regular expression to match fully qualified namespace names.
     */
    private getFullyQualifiedNamespaceRegex(fullyQualifiedNamespace: string): RegExp {
        const escapedNamespace = escapeRegExp(fullyQualifiedNamespace);
        return new RegExp(`(?<![\\p{L}\\d_])${escapedNamespace}(?![\\p{L}\\d_\\\\])`, "gu");
    }

    /**
     * Returns a regular expression to match `use` statements for a namespace.
     * @param fullyQualifiedNamespace The fully qualified namespace to match.
     * @returns A regular expression to match `use` statements for a namespace.
     */
    private getUseStatementRegex(fullyQualifiedNamespace: string): RegExp {
        const escapedNamespace = escapeRegExp(fullyQualifiedNamespace);
        return new RegExp(`use\\s+${escapedNamespace}\\s*;`, "gu");
    }

    /**
     * Returns a regular expression to match the last `use` statement in a file.
     * @returns A regular expression to match the last `use` statement in a file.
     */
    private getLastUseStatementRegex(): RegExp {
        return new RegExp(/^use\s+[\p{L}\d_\\]+\s*;/gmu);
    }

    /**
     * Returns a regular expression to match an identifier.
     * @param identifier The identifier to match.
     * @returns A regular expression to match an identifier.
     */
    private getIdentifierRegex(identifier: string): RegExp {
        const escapedIdentifier = escapeRegExp(identifier);
        return new RegExp(`(?<![\\p{L}\\d_\\\\])${escapedIdentifier}(?![\\p{L}\\d_\\\\])`, "gu");
    }
}
