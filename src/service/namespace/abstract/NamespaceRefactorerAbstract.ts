import * as vscode from "vscode";
import { detectLinebreakType } from "../../../utils/string/detectLinebreakType";
import { getFileContentByUri } from "../../../utils/vscode/getFileContentByUri";
import { setFileContentByUri } from "../../../utils/vscode/setFileContentByUri";
import { IdentifierKindEnum } from "../enum/IdentifierKindEnum";
import { NamespaceRefactorerInterface } from "../interface/NamespaceRefactorerInterface";
import { NamespaceRegExpProvider } from "../provider/NamespaceRegExpProvider";
import { IdentifierType } from "../type/IdentifierType";
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
     * Adds a PHP use statement for the given identifier and namespace to the file content, if not already present.
     * The use statement is inserted after the last existing use statement, or after the namespace declaration if no use statements exist.
     * Handles function and constant imports according to the identifier kind.
     * @param content The file content to modify.
     * @param namespace The fully qualified namespace to import from (without trailing backslash).
     * @param identifier The identifier (name and kind) to import.
     * @returns The updated file content with the new use statement inserted, or the original content if already present or no namespace declaration found.
     */
    protected addUseStatement(content: string, namespace: string, identifier: IdentifierType): string {
        if (this.hasUseStatementForIdentifier(content, identifier)) {
            return content;
        }

        const namespaceDeclarationRegExp = this.namespaceRegExpProvider.getNamespaceDeclarationRegExp();
        const namespaceDeclarationMatch = content.match(namespaceDeclarationRegExp);
        if (!namespaceDeclarationMatch) {
            return content;
        }

        let useKind = "";
        if (identifier.kind === IdentifierKindEnum.Function) {
            useKind = "function ";
        } else if (identifier.kind === IdentifierKindEnum.Constant) {
            useKind = "const ";
        }

        const useStatement = `use ${useKind}${namespace}\\${identifier.name};`;
        const linebreakType = detectLinebreakType(content);

        const lastUseStatementRegExp = this.namespaceRegExpProvider.getLastUseStatementRegExp();
        const lastUseStatementMatch = content.match(lastUseStatementRegExp);
        const addUseTo = lastUseStatementMatch
            ? lastUseStatementMatch[lastUseStatementMatch.length - 1]
            : namespaceDeclarationMatch[0];

        return content.replace(addUseTo, `${addUseTo}${linebreakType}${useStatement}`);
    }

    /**
     * Checks if a use statement for the given identifier already exists in the file content.
     * Considers both direct and aliased imports.
     * @param content The file content to check.
     * @param identifier The identifier (name and kind) to look for.
     * @returns True if a matching use statement exists, otherwise false.
     */
    protected hasUseStatementForIdentifier(content: string, identifier: IdentifierType): boolean {
        const useStatementRegExp = this.namespaceRegExpProvider.getUseStatementRegExp(identifier.name, {
            matchType: "partial",
            matchKind: identifier.kind,
            includeAlias: true,
        });

        const aliasRegExp = this.namespaceRegExpProvider.getUseStatementRegExp(identifier.name, {
            matchType: "alias",
            matchKind: identifier.kind,
        });

        return useStatementRegExp.test(content) || aliasRegExp.test(content);
    }

    /**
     * Removes a PHP use statement for the given identifier and namespace from the file content.
     * Matches the use statement including an optional trailing line break.
     * @param content The file content to modify.
     * @param namespace The fully qualified namespace to remove (without trailing backslash).
     * @param identifier The identifier (name and kind) whose use statement should be removed.
     * @returns The updated file content with the use statement removed.
     */
    protected removeUseStatement(content: string, namespace: string, identifier: IdentifierType): string {
        const fullQualifiedNamespace = `${namespace}\\${identifier.name}`;
        const useStatementRegExp = this.namespaceRegExpProvider.getUseStatementRegExp(fullQualifiedNamespace, {
            matchKind: identifier.kind,
        });
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
}
