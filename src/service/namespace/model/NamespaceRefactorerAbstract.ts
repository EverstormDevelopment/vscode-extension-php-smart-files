import * as vscode from "vscode";
import { getUriFileName } from "../../../utils/filesystem/getUriFileName";
import { findEditorByUri } from "../../../utils/vscode/findEditorByUri";
import { getFileContentByUri } from "../../../utils/vscode/getFileContentByUri";
import { setFileContentByUri } from "../../../utils/vscode/setFileContentByUri";
import { NamespaceRefactorerInterface } from "../interface/NamespaceRefactorerInterface";
import { NamespaceRegExpProvider } from "../provider/NamespaceRegExpProvider";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailType";
import { NamespaceResolver } from "./NamespaceResolver";

/**
 * Abstract class for refactoring namespaces in PHP files.
 */
export abstract class NamespaceRefactorerAbstract implements NamespaceRefactorerInterface {
    /**
     * Initializes the NamespaceRefactorer with a NamespaceResolver.
     * @param namespaceResolver Resolves namespaces for given file URIs.
     */
    constructor(
        protected readonly namespaceResolver: NamespaceResolver,
        protected readonly namespaceRegExpProvider: NamespaceRegExpProvider,
    ) {}

    /**
     * Refactors the namespace and identifiers in a PHP file.
     * @param oldUri The URI of the old file location.
     * @param newUri The URI of the new file location.
     * @returns A promise that resolves to true if refactoring was successful, false otherwise.
     */
    public abstract refactor(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<boolean>;

    /**
     * Updates class identifier references within the file content.
     * Ensures that identifiers are updated to reflect namespace or class name changes.
     * @param content The content of the file to refactor.
     * @param fileNamespace The current namespace of the file.
     * @param refactorDetails The details of the namespace refactor operation.
     * @returns The updated content with refactored identifiers.
     */
    protected refactorIdentifier(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): string {
        const newFullyQualifiedNamespace = `${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier}`;
        const useStatementRegExp = this.namespaceRegExpProvider.getUseStatementRegExp(newFullyQualifiedNamespace);
        if (!useStatementRegExp.test(content) && fileNamespace !== refactorDetails.newNamespace) {
            return content;
        }

        const identifierRegExp = this.namespaceRegExpProvider.getIdentifierRegExp(refactorDetails.oldIdentifier);
        return content.replace(identifierRegExp, refactorDetails.newIdentifier);
    }

    /**
     * Adds a `use` statement for a given namespace and identifier to the file content.
     * Ensures that duplicate `use` statements are not added.
     * @param content The content of the file to update.
     * @param namespace The namespace to add.
     * @param identifier The identifier (class name) to add.
     * @returns The updated content with the new `use` statement.
     */
    protected addUseStatement(content: string, namespace: string, identifier: string): string {
        const fullQualifiedNamespace = `${namespace}\\${identifier}`;
        const hasUseStatementRegExp = this.namespaceRegExpProvider.getUseStatementByIdentiferRegExp(identifier);
        if (hasUseStatementRegExp.test(content)) {
            return content;
        }

        const namespaceDeclarationRegExp = this.namespaceRegExpProvider.getNamespaceDeclarationRegExp();
        const namespaceDeclarationMatch = content.match(namespaceDeclarationRegExp);
        if (!namespaceDeclarationMatch) {
            return content;
        }

        const useStatement = `use ${fullQualifiedNamespace};`;

        const lastUseStatementRegExp = this.namespaceRegExpProvider.getLastUseStatementRegExp();
        const lastUseStatementMatch = content.match(lastUseStatementRegExp);
        if (lastUseStatementMatch) {
            const lastUseMatch = lastUseStatementMatch[lastUseStatementMatch.length - 1];
            return content.replace(lastUseMatch, `${lastUseMatch}\n${useStatement}`);
        }

        return content.replace(namespaceDeclarationMatch[0], `${namespaceDeclarationMatch[0]}\n\n${useStatement}`);
    }

    /**
     * Removes a `use` statement for a given namespace and identifier from the file content.
     * @param content The content of the file to update.
     * @param namespace The namespace to remove.
     * @param identifier The identifier (class name) to remove.
     * @returns The updated content with the `use` statement removed.
     */
    protected removeUseStatement(content: string, namespace: string, identifier: string): string {
        const fullQualifiedNamespace = `${namespace}\\${identifier}`;
        const useStatementRegExp = this.namespaceRegExpProvider.getUseStatementRegExp(fullQualifiedNamespace);
        const useStatementWithLineBreakRegExp = new RegExp(
            `${useStatementRegExp.source}\\s*?\\r?\\n?\\r?`,
            useStatementRegExp.flags
        );

        return content.replace(useStatementWithLineBreakRegExp, "");
    }

    /**
     * Retrieves the content of a file, either from an open editor or by reading from disk.
     * @param uri The URI of the file to read.
     * @returns The content of the file as a string.
     */
    protected async getFileContent(uri: vscode.Uri): Promise<string> {
        return getFileContentByUri(uri);
    }

    /**
     * Sets the content of a file, either in an open editor or directly on disk.
     * Preserves the editor's dirty state if the file is already open.
     * @param uri The URI of the file to update.
     * @param content The new content to write to the file.
     */
    protected async setFileContent(uri: vscode.Uri, content: string): Promise<void> {
        return setFileContentByUri(uri, content);
    }

    /**
     * Finds an open TextEditor for the specified file URI.
     * @param uri The URI of the file to find.
     * @returns The open TextEditor, or undefined if no editor is open for the file.
     */
    protected findOpenEditor(uri: vscode.Uri): vscode.TextEditor | undefined {
        return findEditorByUri(uri);
    }

    /**
     * Retrieves comprehensive details about the namespace refactor operation.
     * Compares old and new namespaces and identifiers to determine what changes are needed.
     * @param oldUri The URI of the old file location.
     * @param newUri The URI of the new file location.
     * @returns An object containing detailed information about the refactor operation.
     */
    protected async getRefactorDetails(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<NamespaceRefactorDetailsType> {
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
}
