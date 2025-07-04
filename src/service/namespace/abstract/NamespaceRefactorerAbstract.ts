import * as vscode from "vscode";
import { getLinebreakType } from "../../../utils/string/getLinebreakType";
import { getFileContentByUri } from "../../../utils/vscode/getFileContentByUri";
import { setFileContentByUri } from "../../../utils/vscode/setFileContentByUri";
import { getUseTypeByKind } from "../../php/function/getUseTypeByKind";
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
        const oldFullyQualifiedNamespace = `${refactorDetails.old.namespace}\\${refactorDetails.old.fileIdentifier.name}`;
        const useStatementRegExp = this.namespaceRegExpProvider.getUseStatementRegExp(oldFullyQualifiedNamespace);
        if (fileNamespace !== refactorDetails.new.namespace && !useStatementRegExp.test(content)) {
            return content;
        }

        const identifierRegExp = this.namespaceRegExpProvider.getIdentifierRegExp(
            refactorDetails.old.fileIdentifier.name,
            true
        );
        return content.replace(identifierRegExp, refactorDetails.new.fileIdentifier.name);
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

        const linebreakType = getLinebreakType(content);
        const useType = getUseTypeByKind(identifier.kind);
        const useStatement = `${linebreakType}use ${useType}${namespace}\\${identifier.name};`;

        const lastUseStatementRegExp = this.namespaceRegExpProvider.getLastUseStatementRegExp();
        const lastUseStatementMatch = content.match(lastUseStatementRegExp);
        const addUseTo = lastUseStatementMatch
            ? lastUseStatementMatch[lastUseStatementMatch.length - 1]
            : namespaceDeclarationMatch[0];

        return content.replace(addUseTo, `${addUseTo}${useStatement}`);
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
     * Orders the use statements in a PHP file content. Sorts use statements by type (normal, function, const)
     * and alphabetically within each type. Preserves the original line breaks and structure of the use block.
     * @param content The file content to modify.
     * @returns The updated content with ordered use statements.
     */
    protected orderUseStatements(content: string): string {
        const regex = this.namespaceRegExpProvider.getUseStatementBlockRegExp();
        const match = regex.exec(content);
        if (!match) {
            return content;
        }

        const lineBreak = getLinebreakType(content);
        const useBlockEnd = lineBreak + lineBreak;

        const blockStart = match.index + match[1].length;
        const blockEnd = match.index + match[0].length;
        const blockContent = match[2];

        const extractedUseStatements = blockContent
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.toLowerCase().startsWith("use "));

        const useBlocks: { [key: string]: string } = {};            
        const filters = {
            normal: /^use\s+(?!function\b|const\b)/,
            function: /^use\s+function\b/i,
            const: /^use\s+const\b/i,
        };
        for (const [key, filter] of Object.entries(filters)) {
            const useBlock = extractedUseStatements
                .filter((line) => filter.test(line.toLowerCase()))
                .sort((a, b) => a.localeCompare(b))
                .join(lineBreak);
            useBlocks[key] = useBlock.length > 0 ? useBlock + useBlockEnd : "";
        }

        const sortedUseStatements = useBlocks.normal + useBlocks.function + useBlocks.const;
        const contentBeforeUseBlock = content.substring(0, blockStart);
        const contentAfterUseBlock = content.substring(blockEnd);
        content = contentBeforeUseBlock + sortedUseStatements + contentAfterUseBlock;
        return content;
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
