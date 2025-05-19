import * as vscode from "vscode";
import { detectLinebreakType } from "../../../utils/string/detectLinebreakType";
import { findEditorByUri } from "../../../utils/vscode/findEditorByUri";
import { getFileContentByUri } from "../../../utils/vscode/getFileContentByUri";
import { setFileContentByUri } from "../../../utils/vscode/setFileContentByUri";
import { NamespaceRefactorerInterface } from "../interface/NamespaceRefactorerInterface";
import { NamespaceRegExpProvider } from "../provider/NamespaceRegExpProvider";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";

/**
 * Abstract base class that implements common functionality for PHP namespace refactoring.
 * Provides methods for manipulating namespace declarations, use statements, and class references.
 */
export abstract class NamespaceRefactorerAbstract implements NamespaceRefactorerInterface {
    constructor(protected readonly namespaceRegExpProvider: NamespaceRegExpProvider) {}

    /**
     * Performs namespace refactoring according to the provided details.
     * @param refactorDetails Details about the namespace and identifier changes.
     * @returns Promise resolving to true if refactoring was performed, false otherwise.
     */
    public abstract refactor(refactorDetails: NamespaceRefactorDetailsType): Promise<boolean>;

    /**
     * Updates class identifier references within file content.
     * @param content The file content to refactor.
     * @param fileNamespace The current namespace of the file.
     * @param refactorDetails Details about the namespace and identifier changes.
     * @returns Updated content with refactored identifiers.
     */
    protected refactorIdentifier(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): string {
        const newFullyQualifiedNamespace = `${refactorDetails.new.namespace}\\${refactorDetails.new.identifier}`;
        const useStatementRegExp = this.namespaceRegExpProvider.getUseStatementRegExp(newFullyQualifiedNamespace);
        if (fileNamespace !== refactorDetails.new.namespace && !useStatementRegExp.test(content)) {
            return content;
        }

        const identifierRegExp = this.namespaceRegExpProvider.getIdentifierRegExp(refactorDetails.old.identifier);
        return content.replace(identifierRegExp, refactorDetails.new.identifier);
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
        if (this.hasUseStatementForIdentifier(content, identifier)) {
            return content;
        }

        const namespaceDeclarationRegExp = this.namespaceRegExpProvider.getNamespaceDeclarationRegExp();
        const namespaceDeclarationMatch = content.match(namespaceDeclarationRegExp);
        if (!namespaceDeclarationMatch) {
            return content;
        }

        const linebreakType = detectLinebreakType(content);
        const useStatement = `use ${namespace}\\${identifier};`;

        const lastUseStatementRegExp = this.namespaceRegExpProvider.getLastUseStatementRegExp();
        const lastUseStatementMatch = content.match(lastUseStatementRegExp);
        if (lastUseStatementMatch) {
            const lastUseMatch = lastUseStatementMatch[lastUseStatementMatch.length - 1];
            return content.replace(lastUseMatch, `${lastUseMatch}${linebreakType}${useStatement}`);
        }

        return content.replace(
            namespaceDeclarationMatch[0],
            `${namespaceDeclarationMatch[0]}${linebreakType}${useStatement}`
        );
    }

    /**
     * Checks if a `use` statement for the given identifier exists in the file content.
     * @param content The content of the file to search.
     * @param identifier The class name or alias to look for in `use` statements.
     * @returns True if a matching `use` statement is found, otherwise false.
     */
    protected hasUseStatementForIdentifier(content: string, identifier: string): boolean {
        const useStatementRegExp = this.namespaceRegExpProvider.getUseStatementRegExp(identifier, {
            matchType: "partial",
            includeAlias: true,
        });

        const aliasRegExp = this.namespaceRegExpProvider.getUseStatementRegExp(identifier, {
            matchType: "alias",
        });

        return useStatementRegExp.test(content) || aliasRegExp.test(content);
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
            `${useStatementRegExp.source}\\s*?\\r?\\n?`,
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
}
