import * as vscode from "vscode";
import { getLinebreakType } from "../../../utils/string/getLinebreakType";
import { getFileContentByUri } from "../../../utils/vscode/getFileContentByUri";
import { setFileContentByUri } from "../../../utils/vscode/setFileContentByUri";
import { getUseTypeByKind } from "../../php/function/getUseTypeByKind";
import { NamespaceRefactorerInterface } from "../interface/NamespaceRefactorerInterface";
import { NameResolutionEnum } from "../enum/NameResolutionEnum";
import { PhpAstTraverser } from "../parser/PhpAstTraverser";
import { PhpParser } from "../parser/PhpParser";
import { NamespaceRegExpProvider } from "../provider/NamespaceRegExpProvider";
import { IdentifierKindEnum } from "../enum/IdentifierKindEnum";
import { IdentifierType } from "../type/IdentifierType";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";
import { UseStatementType } from "../type/UseStatementType";

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
     * Skips replacement when the file is in the new namespace and no use statement exists.
     * The name replacement itself uses a word-boundary regex (intentionally kept simple).
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
        const oldIdentifier = refactorDetails.old.fileIdentifier;
        const oldFQN = `\\${refactorDetails.old.namespace}\\${oldIdentifier.name}`;
        const newFQN = `\\${refactorDetails.new.namespace}\\${refactorDetails.new.fileIdentifier.name}`;
        const hasUseStatement =
            this.hasUseStatementForIdentifier(content, oldIdentifier) ||
            this.hasUseStatementForIdentifier(content, refactorDetails.new.fileIdentifier);
        const parser = new PhpParser(content);
        const references = new PhpAstTraverser(parser.getAST())
            .getNameReferences(false)
            .filter((reference) => reference.kind === IdentifierKindEnum.Oop)
            .sort((a, b) => b.loc.start - a.loc.start);

        for (const reference of references) {
            let newText: string | undefined;

            if (reference.resolution === NameResolutionEnum.Fqn && reference.name === oldFQN) {
                newText = newFQN;
            }

            if (
                reference.resolution === NameResolutionEnum.Qn &&
                `\\${fileNamespace}\\${reference.name}` === oldFQN
            ) {
                newText = reference.name.replace(
                    this.namespaceRegExpProvider.getIdentifierRegExp(oldIdentifier.name, true),
                    refactorDetails.new.fileIdentifier.name
                );
            }

            if (
                reference.resolution === NameResolutionEnum.Uqn &&
                reference.name === oldIdentifier.name &&
                (fileNamespace === refactorDetails.new.namespace || hasUseStatement)
            ) {
                newText = refactorDetails.new.fileIdentifier.name;
            }

            if (!newText) {
                continue;
            }

            content = content.slice(0, reference.loc.start) + newText + content.slice(reference.loc.end);
        }

        return content;
    }

    /**
     * Adds a PHP use statement for the given identifier and namespace to the file content, if not already present.
     * Inserts after the last existing use statement, or after the namespace declaration if none exist.
     * @param content The file content to modify.
     * @param namespace The fully qualified namespace to import from (without trailing backslash).
     * @param identifier The identifier (name and kind) to import.
     * @returns The updated file content with the new use statement inserted, or unchanged if already present.
     */
    protected addUseStatement(content: string, namespace: string, identifier: IdentifierType): string {
        if (this.hasUseStatementForIdentifier(content, identifier)) {
            return content;
        }

        const parser = new PhpParser(content);
        const namespaceLoc = parser.getNamespaceLoc();
        if (!namespaceLoc) {
            return content;
        }

        const linebreakType = getLinebreakType(content);
        const useType = getUseTypeByKind(identifier.kind);
        const newUseStatement = `${linebreakType}use ${useType}${namespace}\\${identifier.name};`;

        const useStatements = parser.getUseStatements();
        const insertAfterOffset =
            useStatements.length > 0
                ? useStatements[useStatements.length - 1].loc.end
                : namespaceLoc.end;

        return content.slice(0, insertAfterOffset) + newUseStatement + content.slice(insertAfterOffset);
    }

    /**
     * Checks if a use statement for the given identifier already exists in the file content.
     * Considers both direct (last segment match) and aliased imports.
     * @param content The file content to check.
     * @param identifier The identifier (name and kind) to look for.
     * @returns True if a matching use statement exists, otherwise false.
     */
    protected hasUseStatementForIdentifier(content: string, identifier: IdentifierType): boolean {
        const useStatements = new PhpParser(content).getUseStatements();
        return useStatements.some((stmt) => {
            if (!this.useStatementKindMatches(stmt.kind, identifier.kind)) {
                return false;
            }
            const lastSegment = stmt.name.split("\\").pop() ?? "";
            return lastSegment === identifier.name || stmt.alias === identifier.name;
        });
    }

    /**
     * Removes a PHP use statement for the given identifier and namespace from the file content.
     * Grouped use statements are skipped (cannot be individually removed).
     * Also removes the immediately following newline(s).
     * @param content The file content to modify.
     * @param namespace The fully qualified namespace to remove (without trailing backslash).
     * @param identifier The identifier (name and kind) whose use statement should be removed.
     * @returns The updated file content with the use statement removed.
     */
    protected removeUseStatement(content: string, namespace: string, identifier: IdentifierType): string {
        const fullName = `${namespace}\\${identifier.name}`;
        const useStatements = new PhpParser(content).getUseStatements();
        const stmt = useStatements.find(
            (s) => !s.grouped && s.name === fullName && this.useStatementKindMatches(s.kind, identifier.kind)
        );

        if (!stmt) {
            return content;
        }

        // Remove statement and any immediately following newline(s)
        let end = stmt.loc.end;
        while (end < content.length && (content[end] === "\r" || content[end] === "\n")) {
            end++;
        }

        return content.slice(0, stmt.loc.start) + content.slice(end);
    }

    /**
     * Removes non-aliased use statements that point to the file's own namespace.
     * These imports are redundant after a move because names from the current namespace
     * can be referenced directly without an import.
     * @param content The file content to modify.
     * @param namespace The current namespace of the file.
     * @returns The updated file content without redundant same-namespace imports.
     */
    protected removeOwnNamespaceUseStatements(content: string, namespace: string): string {
        const useStatements = new PhpParser(content)
            .getUseStatements()
            .filter((statement) => {
                if (statement.grouped || statement.alias !== null) {
                    return false;
                }

                const importedSegments = statement.name.split("\\");
                if (importedSegments.length < 2) {
                    return false;
                }

                const importedNamespace = importedSegments.slice(0, -1).join("\\");
                return importedNamespace === namespace;
            })
            .sort((a, b) => b.loc.start - a.loc.start);

        for (const statement of useStatements) {
            let end = statement.loc.end;
            while (end < content.length && (content[end] === "\r" || content[end] === "\n")) {
                end++;
            }

            content = content.slice(0, statement.loc.start) + content.slice(end);
        }

        return content;
    }

    /**
     * Orders the use statements in a PHP file content. Sorts by type (normal, function, const)
     * and alphabetically within each group. Uses AST to locate the use block boundaries,
     * then re-sorts the raw source lines (preserving grouped statements as-is).
     * @param content The file content to modify.
     * @returns The updated content with ordered use statements.
     */
    protected orderUseStatements(content: string): string {
        const config = vscode.workspace.getConfiguration("phpSmartFiles");
        if (!config.get<boolean>("refactorNamespacesSortUseStatements", true)) {
            return content;
        }

        const useStatements = new PhpParser(content).getUseStatements();
        if (useStatements.length === 0) {
            return content;
        }

        const lineBreak = getLinebreakType(content);
        const blockStart = useStatements[0].loc.start;
        const lastStmt = useStatements[useStatements.length - 1];

        // Advance past trailing whitespace after the use block (same as prior regex \\s* behavior)
        let blockEnd = lastStmt.loc.end;
        while (blockEnd < content.length && /\s/.test(content[blockEnd])) {
            blockEnd++;
        }

        // Extract raw use statement lines and sort them (grouped statements handled as opaque lines)
        const rawBlock = content.slice(blockStart, lastStmt.loc.end);
        const allLines = rawBlock
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.toLowerCase().startsWith("use "));

        const filterAndSort = (pattern: RegExp): string[] =>
            allLines.filter((line) => pattern.test(line)).sort((a, b) => a.localeCompare(b));

        const normalLines = filterAndSort(/^use\s+(?!function\b|const\b)/i);
        const functionLines = filterAndSort(/^use\s+function\b/i);
        const constantLines = filterAndSort(/^use\s+const\b/i);

        const sections: string[] = [];
        if (normalLines.length > 0) {
            sections.push(normalLines.join(lineBreak));
        }
        if (functionLines.length > 0) {
            sections.push(functionLines.join(lineBreak));
        }
        if (constantLines.length > 0) {
            sections.push(constantLines.join(lineBreak));
        }

        const sortedBlock = sections.join(lineBreak + lineBreak);
        return content.slice(0, blockStart) + sortedBlock + lineBreak + lineBreak + content.slice(blockEnd);
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
     * @param uri The URI of the file to update.
     * @param content The new content to write to the file.
     */
    protected async setFileContent(uri: vscode.Uri, content: string): Promise<void> {
        return setFileContentByUri(uri, content);
    }

    /**
     * Checks if a use statement kind matches an identifier kind.
     * Function and Constant require exact kind match; everything else matches Oop use statements.
     * @param stmtKind The kind of the use statement.
     * @param identifierKind The kind of the identifier to match against.
     * @returns True if the kinds are compatible.
     */
    protected useStatementKindMatches(stmtKind: IdentifierKindEnum, identifierKind: IdentifierKindEnum): boolean {
        if (identifierKind === IdentifierKindEnum.Function) {
            return stmtKind === IdentifierKindEnum.Function;
        }
        if (identifierKind === IdentifierKindEnum.Constant) {
            return stmtKind === IdentifierKindEnum.Constant;
        }
        return stmtKind === IdentifierKindEnum.Oop;
    }

    /**
     * Returns a UseStatementType from a parsed list by exact FQN and kind match.
     * @param useStatements The list of parsed use statements.
     * @param fullName The fully qualified name to find (without leading backslash).
     * @param identifier The identifier providing the kind to match.
     * @returns The matching UseStatementType, or undefined if not found.
     */
    protected findUseStatement(
        useStatements: UseStatementType[],
        fullName: string,
        identifier: IdentifierType
    ): UseStatementType | undefined {
        return useStatements.find(
            (s) => s.name === fullName && this.useStatementKindMatches(s.kind, identifier.kind)
        );
    }
}
