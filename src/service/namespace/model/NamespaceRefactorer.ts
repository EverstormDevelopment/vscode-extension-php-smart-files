import * as vscode from "vscode";
import { getUriFileName } from "../../../utils/filesystem/getUriFileName";
import { escapeRegExp } from "../../../utils/regex/escapeRegExp";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailType";
import { NamespaceResolver } from "./NamespaceResolver";
import { getPathNormalized } from "../../../utils/filesystem/getPathNormalized";

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
     * Updates both the moved/renamed file and all its references in the workspace.
     * @param oldUri The original URI of the file before moving/renaming.
     * @param newUri The new URI of the file after moving/renaming.
     */
    public async updateFileAndReferences(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const updatedFile = await this.updateFile(oldUri, newUri);
        if (!updatedFile) {
            return;
        }

        await this.updateReferences(oldUri, newUri);
    }

    /**
     * Updates the namespace and class references within the moved/renamed file itself.
     * @param oldUri The original URI of the file before moving/renaming.
     * @param newUri The new URI of the file after moving/renaming.
     * @returns A boolean indicating whether any updates were made to the file.
     */
    public async updateFile(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<boolean> {
        try {
            const refactorDetails = await this.getRefactorDetails(oldUri, newUri);
            if (!refactorDetails.hasNamespaces || !refactorDetails.hasChanged) {
                return false;
            }

            const fileContent = await this.getFileContent(refactorDetails.newUri);

            let updatedContent = fileContent;
            if (refactorDetails.hasNamespaceChanged) {
                updatedContent = this.refactorNamespace(fileContent, refactorDetails);
            }
            if (refactorDetails.hasIdentifierChanged) {
                updatedContent = this.refactorDefinition(fileContent, refactorDetails);
                updatedContent = this.refactorIdentifier(fileContent, refactorDetails.newNamespace, refactorDetails);
            }
            if (updatedContent === fileContent) {
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
     * Updates references to a namespace in other files within the workspace.
     * @param oldDeclarationUri The URI of the file before moving/renaming.
     * @param newDeclarationUri The URI of the file after moving/renaming.
     */
    public async updateReferences(oldDeclarationUri: vscode.Uri, newDeclarationUri: vscode.Uri): Promise<void> {
        const refactorDetails = await this.getRefactorDetails(oldDeclarationUri, newDeclarationUri);
        if (!refactorDetails.hasNamespaces || !refactorDetails.hasChanged) {
            return;
        }

        await this.progressUpdateReferences(refactorDetails);
    }

    /**
     * Updates references in multiple files with progress reporting via a notification.
     * @param refactorDetails The details of the namespace refactor operation.
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
            const files = await this.findFilesToRefactor(refactorDetails.newUri);
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
     * Updates namespace references in a single file based on refactor details.
     * @param uri The URI of the file to update.
     * @param refactorDetails The details of the namespace refactor operation.
     */
    private async updateReference(uri: vscode.Uri, refactorDetails: NamespaceRefactorDetailsType): Promise<void> {
        try {
            const fileContent = await this.getFileContent(uri);
            const namespaceDecalrationRegExp = this.getNamespaceDeclarationRegExp();
            const namespaceDeclarationMatch = fileContent.match(namespaceDecalrationRegExp);
            const fileNamespace = namespaceDeclarationMatch?.[1];
            if (!fileNamespace) {
                return;
            }

            let fileContentUpdated = fileContent;
            fileContentUpdated = this.refactorFullyQualified(fileContentUpdated, fileNamespace, refactorDetails);
            fileContentUpdated = this.refactorUseStatement(fileContentUpdated, fileNamespace, refactorDetails);
            fileContentUpdated = this.refactorIdentifier(fileContentUpdated, fileNamespace, refactorDetails);
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
     * Updates the namespace declaration in the file content.
     * @param content The content of the file to refactor.
     * @param refactorDetails The details of the namespace refactor operation.
     * @returns The updated content with the new namespace declaration.
     */
    private refactorNamespace(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const namespaceRegExp = this.getNamespaceDeclarationRegExp();
        const hasMatch = namespaceRegExp.test(content);
        if (!hasMatch) {
            return content;
        }

        return content.replace(namespaceRegExp, `namespace ${refactorDetails.newNamespace};`);
    }

    /**
     * Updates the class, interface, trait, or enum definition in the file content.
     * @param content The content of the file to refactor.
     * @param refactorDetails The details of the namespace refactor operation.
     * @returns The updated content with the new definition.
     * @throws Error if the new identifier is invalid or if no definition is found.
     */
    private refactorDefinition(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const validationRegExp = this.getIdentifierValidationRegExp();
        const newIdentifier = refactorDetails.newIdentifier;
        if (!validationRegExp.test(newIdentifier)) {
            const message = vscode.l10n.t(
                "The provided name '{0}' is not a valid PHP identifier. The refactoring process has been canceled.",
                newIdentifier
            );
            throw new Error(message);
        }

        const definitionRegExp = this.getDefinitionRegExp();
        const definitionMatch = definitionRegExp.exec(content);
        if (!definitionMatch) {
            const message = vscode.l10n.t(
                "Unable to locate a valid definition. The refactoring process has been canceled."
            );
            throw new Error(message);
        }

        const newDefinition = `${definitionMatch[1]} ${refactorDetails.newIdentifier}`;
        return content.replace(definitionRegExp, newDefinition);
    }

    /**
     * Updates class identifier references within the file content.
     * @param content The content of the file to refactor.
     * @param fileNamespace The current namespace of the file.
     * @param refactorDetails The details of the namespace refactor operation.
     * @returns The updated content with refactored identifiers.
     */
    private refactorIdentifier(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): string {
        const newFullyQualifiedNamespace = `${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier}`;
        const useStatementRegExp = this.getUseStatementRegExp(newFullyQualifiedNamespace);
        if (!useStatementRegExp.test(content) && fileNamespace !== refactorDetails.newNamespace) {
            return content;
        }

        const identifierRegExp = this.getIdentifierRegExp(refactorDetails.oldIdentifier);
        return content.replace(identifierRegExp, refactorDetails.newIdentifier);
    }

    /**
     * Updates fully qualified namespace references in the content.
     * Handles different replacement strategies based on the file's namespace context.
     * @param content The content of the file to refactor.
     * @param fileNamespace The namespace of the file being refactored.
     * @param refactorDetails The details of the namespace refactor operation.
     * @returns The updated content with refactored fully qualified namespaces.
     */
    private refactorFullyQualified(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): string {
        const oldFullyQualifiedNamespace = `\\${refactorDetails.oldNamespace}\\${refactorDetails.oldIdentifier}`;
        const newFullyQualifiedNamespace = `\\${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier}`;

        if (fileNamespace === refactorDetails.newNamespace) {
            return this.replaceFullyQualified(content, oldFullyQualifiedNamespace, refactorDetails.newIdentifier);
        }

        return this.replaceFullyQualified(content, oldFullyQualifiedNamespace, newFullyQualifiedNamespace);
    }

    /**
     * Replaces occurrences of a fully qualified namespace with a new one.
     * Ensures proper word boundaries to avoid partial replacements.
     * @param content The content of the file to process.
     * @param oldFullyQualifiedNamespace The old fully qualified namespace to replace.
     * @param newFullyQualifiedNamespace The new fully qualified namespace to use as replacement.
     * @returns The updated content with replaced fully qualified namespaces.
     */
    private replaceFullyQualified(
        content: string,
        oldFullyQualifiedNamespace: string,
        newFullyQualifiedNamespace: string
    ): string {
        const fqcnRegExp = this.getFullyQualifiedNamespaceRegExp(oldFullyQualifiedNamespace);
        return content.replace(fqcnRegExp, newFullyQualifiedNamespace);
    }

    /**
     * Handles refactoring of `use` statements based on file namespace context.
     * May add, remove, or replace use statements depending on the context.
     * @param content The content of the file to refactor.
     * @param fileNamespace The namespace of the file being refactored.
     * @param refactorDetails The details of the namespace refactoring operation.
     * @returns The updated content with refactored use statements.
     */
    private refactorUseStatement(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): string {
        if (fileNamespace === refactorDetails.oldNamespace) {
            return this.addUseStatement(content, refactorDetails);
        }

        if (fileNamespace === refactorDetails.newNamespace) {
            return this.removeUseStatement(content, refactorDetails);
        }

        return this.replaceUseStatement(content, refactorDetails);
    }

    /**
     * Replaces an existing `use` statement with an updated one.
     * @param content The content of the file to refactor.
     * @param refactorDetails The details of the namespace refactoring operation.
     * @returns The updated content with replaced use statements.
     */
    private replaceUseStatement(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const oldFullQualifiedNamespace = `${refactorDetails.oldNamespace}\\${refactorDetails.oldIdentifier}`;
        const newFullQualifiedNamespace = `${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier}`;
        const useRegExp = this.getUseStatementRegExp(oldFullQualifiedNamespace);
        return content.replace(useRegExp, `use ${newFullQualifiedNamespace};`);
    }

    /**
     * Adds a `use` statement for the new namespace if needed and not already present.
     * Only adds the statement if the file contains references to the identifier.
     * @param content The content of the file to refactor.
     * @param refactorDetails The details of the namespace refactoring operation.
     * @returns The updated content with added use statements where necessary.
     */
    private addUseStatement(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const fullQualifiedNamespace = `${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier}`;
        const hasUseStatementRegExp = this.getUseStatementRegExp(fullQualifiedNamespace);
        const hasIdentifierRegExp = this.getIdentifierRegExp(refactorDetails.newIdentifier);
        if (hasUseStatementRegExp.test(content) || !hasIdentifierRegExp.test(content)) {
            return content;
        }

        const namespaceDeclarationRegExp = this.getNamespaceDeclarationRegExp();
        const namespaceDeclarationMatch = content.match(namespaceDeclarationRegExp);
        if (!namespaceDeclarationMatch) {
            return content;
        }

        const useStatement = `use ${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier};`;

        const lastUseStatementRegExp = this.getLastUseStatementRegExp();
        const lastUseStatementMatch = content.match(lastUseStatementRegExp);
        if (lastUseStatementMatch) {
            const lastUseMatch = lastUseStatementMatch[lastUseStatementMatch.length - 1];
            return content.replace(lastUseMatch, `${lastUseMatch}\n${useStatement}`);
        }

        return content.replace(namespaceDeclarationMatch[0], `${namespaceDeclarationMatch[0]}\n\n${useStatement}`);
    }

    /**
     * Removes a `use` statement for the old namespace if it's no longer needed.
     * Also removes any associated line breaks to keep the code clean.
     * @param content The content of the file to refactor.
     * @param refactorDetails The details of the namespace refactoring operation.
     * @returns The updated content with removed use statements.
     */
    private removeUseStatement(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const fullQualifiedNamespace = `${refactorDetails.oldNamespace}\\${refactorDetails.oldIdentifier}`;
        const useStatementRegExp = this.getUseStatementRegExp(fullQualifiedNamespace);
        const useStatementWithLineBreakRegExp = new RegExp(
            `${useStatementRegExp.source}\\s*?\\r?\\n?\\r?`,
            useStatementRegExp.flags
        );

        return content.replace(useStatementWithLineBreakRegExp, "");
    }

    /**
     * Updates the content of a file, either in an open editor or directly on disk.
     * Preserves the editor's dirty state if the file is already open.
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
     * Finds an open TextEditor for the specified file URI.
     * @param uri The URI of the file to find.
     * @returns The open TextEditor, or undefined if no editor is open for the file.
     */
    private findOpenEditor(uri: vscode.Uri): vscode.TextEditor | undefined {
        return vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === uri.toString());
    }

    /**
     * Finds all PHP files in the workspace to check for references.
     * Excludes specified folders from configuration and the file being refactored.
     * @param fileUri The URI of the file being refactored to exclude it from the list.
     * @returns A list of URIs for PHP files to scan for references.
     */
    private async findFilesToRefactor(fileUri: vscode.Uri): Promise<vscode.Uri[]> {
        const config = vscode.workspace.getConfiguration("phpFileCreator");
        const excludedFolders = config.get<string[]>("refactorNamespacesExcludeDirectories", []);

        const relativeFilePath = vscode.workspace.asRelativePath(fileUri.fsPath);
        const excludedFile = getPathNormalized(relativeFilePath);

        const excludePattern = `{${[...excludedFolders, excludedFile].join(",")}}`;
        return vscode.workspace.findFiles("**/*.php", excludePattern);
    }

    /**
     * Retrieves comprehensive details about the namespace refactor operation.
     * Compares old and new namespaces and identifiers to determine what changes are needed.
     * @param oldUri The URI of the old file location.
     * @param newUri The URI of the new file location.
     * @returns An object containing detailed information about the refactor operation.
     */
    private async getRefactorDetails(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<NamespaceRefactorDetailsType> {
        const oldNamespace = (await this.namespaceResolver.resolve(oldUri)) || "";
        const newNamespace = (await this.namespaceResolver.resolve(newUri)) || "";
        const oldIdentifier = getUriFileName(oldUri);
        const newIdentifier = getUriFileName(newUri);
        const hasNamespaces = !!oldNamespace && !!newNamespace;
        const hasNamespaceChanged = oldNamespace !== newNamespace;
        const hasIdentifierChanged = oldIdentifier !== newIdentifier;
        const hasChanged = hasNamespaceChanged || hasIdentifierChanged;

        return {
            oldUri: oldUri,
            newUri: newUri,
            oldIdentifier: oldIdentifier,
            newIdentifier: newIdentifier,
            oldNamespace: oldNamespace,
            newNamespace: newNamespace,
            hasNamespaces: hasNamespaces,
            hasNamespaceChanged: hasNamespaceChanged,
            hasIdentifierChanged: hasIdentifierChanged,
            hasChanged: hasChanged,
        };
    }

    /**
     * Creates a regular expression to match a specific namespace declaration.
     * @param namespace The namespace to match in the declaration.
     * @returns A regular expression for matching the namespace declaration.
     */
    private getNamespaceRegExp(namespace: string): RegExp {
        const escapedNamespace = escapeRegExp(namespace);
        return new RegExp(`[^\\r\\n\\s]*namespace\\s+${escapedNamespace}\\s*;`, "mu");
    }

    /**
     * Creates a regular expression to match any namespace declaration.
     * @returns A regular expression that captures the namespace name.
     */
    private getNamespaceDeclarationRegExp(): RegExp {
        return new RegExp(/[^\r\n\s]*namespace\s+([\p{L}\d_\\]+)\s*;/mu);
    }

    /**
     * Creates a regular expression to match fully qualified namespace references.
     * Includes word boundary checks to prevent partial matches.
     * @param fullyQualifiedNamespace The fully qualified namespace to match.
     * @returns A regular expression for matching the fully qualified namespace.
     */
    private getFullyQualifiedNamespaceRegExp(fullyQualifiedNamespace: string): RegExp {
        const escapedNamespace = escapeRegExp(fullyQualifiedNamespace);
        return new RegExp(`(?<![\\p{L}\\d_])${escapedNamespace}(?![\\p{L}\\d_\\\\])`, "gu");
    }

    /**
     * Creates a regular expression to match `use` statements for a specific namespace.
     * @param fullyQualifiedNamespace The fully qualified namespace to match in use statements.
     * @returns A regular expression for matching use statements.
     */
    private getUseStatementRegExp(fullyQualifiedNamespace: string): RegExp {
        const escapedNamespace = escapeRegExp(fullyQualifiedNamespace);
        return new RegExp(`use\\s+${escapedNamespace}\\s*;`, "gu");
    }

    /**
     * Creates a regular expression to match the last `use` statement in a file.
     * Used to determine where to add new use statements.
     * @returns A regular expression for matching use statements.
     */
    private getLastUseStatementRegExp(): RegExp {
        return new RegExp(/^use\s+[\p{L}\d_\\]+\s*;/gmu);
    }

    /**
     * Creates a regular expression to match standalone identifiers.
     * Includes word boundary checks to prevent partial matches.
     * @param identifier The identifier to match.
     * @returns A regular expression for matching the identifier.
     */
    private getIdentifierRegExp(identifier: string): RegExp {
        const escapedIdentifier = escapeRegExp(identifier);
        return new RegExp(`(?<![\\p{L}\\d_\\\\])${escapedIdentifier}(?![\\p{L}\\d_\\\\])`, "gu");
    }

    /**
     * Creates a regular expression to validate PHP identifiers.
     * Ensures the identifier follows PHP naming rules.
     * @returns A regular expression for validating PHP identifiers.
     */
    private getIdentifierValidationRegExp(): RegExp {
        return new RegExp(`^[\\p{L}_][\\p{L}\\d_]*$`, "u");
    }

    /**
     * Creates a regular expression to match PHP class/interface/enum/trait definitions.
     * Used to find and update the main definition in the file.
     * @returns A regular expression that captures the definition type and name.
     */
    private getDefinitionRegExp(): RegExp {
        return new RegExp(`\\b(class|interface|enum|trait)\\s+([\\p{L}_][\\p{L}\\d_]*)`, "gu");
    }
}
