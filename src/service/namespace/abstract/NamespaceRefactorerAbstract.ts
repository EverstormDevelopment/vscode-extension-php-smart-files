import * as vscode from "vscode";
import { getLinebreakType } from "../../../utils/string/getLinebreakType";
import { getFileContentByUri } from "../../../utils/vscode/getFileContentByUri";
import { setFileContentByUri } from "../../../utils/vscode/setFileContentByUri";
import { getUseTypeByKind } from "../../php/function/getUseTypeByKind";
import { IdentifierKindEnum } from "../enum/IdentifierKindEnum";
import { NameResolutionEnum } from "../enum/NameResolutionEnum";
import { NamespaceRefactorerInterface } from "../interface/NamespaceRefactorerInterface";
import { PhpAstTraverser } from "../parser/PhpAstTraverser";
import { PhpParser } from "../parser/PhpParser";
import { IdentifierType } from "../type/IdentifierType";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";
import { UseStatementType } from "../type/UseStatementType";

/**
 * Abstract base class that implements common functionality for PHP namespace refactoring.
 * Provides methods for manipulating namespace declarations, use statements, and class references.
 */
export abstract class NamespaceRefactorerAbstract implements NamespaceRefactorerInterface {
    /**
     * Performs namespace refactoring according to the provided details.
     * @param refactorDetails Details about the namespace and identifier changes.
     * @returns Promise resolving to true if refactoring was performed, false otherwise.
     */
    public abstract refactor(refactorDetails: NamespaceRefactorDetailsType): Promise<boolean>;

    /**
     * Updates class identifier references within file content.
     * Skips replacement when the file is in the new namespace and no use statement exists.
     * @param content The file content to refactor.
     * @param fileNamespace The current namespace of the file.
     * @param refactorDetails Details about the namespace and identifier changes.
     * @returns Updated content with refactored identifiers.
     */
    protected refactorIdentifier(content: string, fileNamespace: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const oldIdentifier = refactorDetails.old.fileIdentifier;
        const oldFQN = `\\${refactorDetails.old.namespace}\\${oldIdentifier.name}`;
        const newFQN = `\\${refactorDetails.new.namespace}\\${refactorDetails.new.fileIdentifier.name}`;
        const parser = this.getCheckedParser(content);
        const useStatements = parser.getUseStatements();
        const references = new PhpAstTraverser(parser.getAST(), content)
            .getNameReferences(false)
            .filter((reference) => reference.kind === IdentifierKindEnum.Oop)
            .sort((a, b) => b.loc.start - a.loc.start);

        for (const reference of references) {
            let newText: string | undefined;

            if (reference.resolution === NameResolutionEnum.Fqn && reference.name === oldFQN) {
                newText = newFQN;
            }

            if (reference.resolution === NameResolutionEnum.Qn && `\\${fileNamespace}\\${reference.name}` === oldFQN) {
                const segments = reference.name.split("\\");
                segments[segments.length - 1] = refactorDetails.new.fileIdentifier.name;
                newText = segments.join("\\");
            }

            if (
                reference.resolution === NameResolutionEnum.Uqn &&
                reference.name === oldIdentifier.name &&
                this.canRenameUnqualifiedIdentifier(fileNamespace, useStatements, refactorDetails)
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
     * Checks whether an unqualified reference with the old identifier name resolves to
     * the symbol currently being renamed.
     * @param fileNamespace The namespace of the file being processed.
     * @param useStatements Parsed use statements from the file.
     * @param refactorDetails Details about the namespace and identifier changes.
     * @returns True when the unqualified reference should be renamed.
     */
    private canRenameUnqualifiedIdentifier(fileNamespace: string, useStatements: UseStatementType[], refactorDetails: NamespaceRefactorDetailsType): boolean {
        const oldIdentifier = refactorDetails.old.fileIdentifier;
        const newIdentifier = refactorDetails.new.fileIdentifier;
        const oldFullName = `${refactorDetails.old.namespace}\\${oldIdentifier.name}`;
        const newFullName = `${refactorDetails.new.namespace}\\${newIdentifier.name}`;

        if (this.hasVisibleUseStatement(useStatements, oldFullName, oldIdentifier.name, oldIdentifier)) {
            return true;
        }

        if (this.hasVisibleUseStatement(useStatements, newFullName, newIdentifier.name, newIdentifier)) {
            return true;
        }

        return fileNamespace === refactorDetails.new.namespace && !this.hasVisibleUseStatementForIdentifier(useStatements, oldIdentifier);
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

        const parser = this.getCheckedParser(content);
        const namespaceLoc = parser.getNamespaceLoc();
        if (!namespaceLoc) {
            return content;
        }

        const linebreakType = getLinebreakType(content);
        const useType = getUseTypeByKind(identifier.kind);
        const newUseStatement = `${linebreakType}use ${useType}${namespace}\\${identifier.name};`;

        const useStatements = parser.getUseStatements();
        const insertAfterOffset = useStatements.length > 0 ? useStatements[useStatements.length - 1].loc.end : namespaceLoc.end;

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
        const useStatements = this.getCheckedParser(content).getUseStatements();
        return this.hasVisibleUseStatementForIdentifier(useStatements, identifier);
    }

    /**
     * Checks whether a visible import name matches the given identifier.
     * @param useStatements Parsed use statements from the file.
     * @param identifier The identifier to look for.
     * @returns True if a matching visible import exists.
     */
    private hasVisibleUseStatementForIdentifier(useStatements: UseStatementType[], identifier: IdentifierType): boolean {
        return useStatements.some((stmt) => {
            if (!this.useStatementKindMatches(stmt.kind, identifier.kind)) {
                return false;
            }
            return this.getUseStatementVisibleName(stmt) === identifier.name;
        });
    }

    /**
     * Checks whether a use statement imports a specific FQN under the expected visible name.
     * @param useStatements Parsed use statements from the file.
     * @param fullName The fully qualified name without leading backslash.
     * @param visibleName The unqualified name visible in source code.
     * @param identifier The identifier kind to match.
     * @returns True when a matching import exists.
     */
    private hasVisibleUseStatement(useStatements: UseStatementType[], fullName: string, visibleName: string, identifier: IdentifierType): boolean {
        return useStatements.some((stmt) => {
            return stmt.name === fullName && this.useStatementKindMatches(stmt.kind, identifier.kind) && this.getUseStatementVisibleName(stmt) === visibleName;
        });
    }

    /**
     * Returns the unqualified source name introduced by a use statement.
     * @param useStatement The use statement to inspect.
     * @returns The alias or final imported namespace segment.
     */
    private getUseStatementVisibleName(useStatement: UseStatementType): string {
        return useStatement.alias ?? useStatement.name.split("\\").pop() ?? "";
    }

    /**
     * Removes a PHP use statement for the given identifier and namespace from the file content.
     * Grouped imports are rewritten in place, collapsed to a single `use`, or removed entirely.
     * @param content The file content to modify.
     * @param namespace The fully qualified namespace to remove (without trailing backslash).
     * @param identifier The identifier (name and kind) whose use statement should be removed.
     * @returns The updated file content with the use statement removed.
     */
    protected removeUseStatement(content: string, namespace: string, identifier: IdentifierType): string {
        const fullName = `${namespace}\\${identifier.name}`;
        const useStatements = this.getCheckedParser(content).getUseStatements();
        const stmt = this.findUseStatement(useStatements, fullName, identifier);

        if (!stmt) {
            return content;
        }

        if (!stmt.grouped) {
            return this.removeUseStatementBlock(content, stmt.groupLoc);
        }

        const remainingStatements = this.getGroupedUseStatements(useStatements, stmt).filter(
            (groupedStatement) => !(groupedStatement.name === fullName && this.useStatementKindMatches(groupedStatement.kind, identifier.kind)),
        );

        return this.replaceUseStatementGroup(content, stmt, remainingStatements);
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
        const useStatements = this.getCheckedParser(content).getUseStatements();
        const groups = this.getUniqueUseStatementGroups(useStatements).sort((a, b) => b.groupLoc.start - a.groupLoc.start);

        for (const group of groups) {
            const remainingStatements = group.statements.filter((statement) => {
                if (statement.alias !== null) {
                    return true;
                }

                const importedNamespace = this.getImportedNamespace(statement.name);
                return importedNamespace !== namespace;
            });

            if (remainingStatements.length === group.statements.length) {
                continue;
            }

            content = this.replaceUseStatementGroup(content, group.statements[0], remainingStatements);
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

        const useStatementGroups = this.getUniqueUseStatementGroups(this.getCheckedParser(content).getUseStatements());
        if (useStatementGroups.length === 0) {
            return content;
        }

        const lineBreak = getLinebreakType(content);
        const blockStart = useStatementGroups[0].groupLoc.start;
        const lastGroup = useStatementGroups[useStatementGroups.length - 1];

        let blockEnd = lastGroup.groupLoc.end;
        while (blockEnd < content.length && (content[blockEnd] === "\r" || content[blockEnd] === "\n")) {
            blockEnd++;
        }

        const sections = this.getSortedUseStatementSections(useStatementGroups, content, lineBreak);

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
    protected findUseStatement(useStatements: UseStatementType[], fullName: string, identifier: IdentifierType): UseStatementType | undefined {
        return useStatements.find((s) => s.name === fullName && this.useStatementKindMatches(s.kind, identifier.kind));
    }

    /**
     * Groups use statements by their shared source location and kind, returning unique groups sorted by position.
     * @param useStatements All use statements parsed from the file
     * @returns Array of unique groups, each containing the shared location and the statements belonging to it
     */
    private getUniqueUseStatementGroups(
        useStatements: UseStatementType[],
    ): Array<{ groupKey: string; groupLoc: UseStatementType["groupLoc"]; kind: IdentifierKindEnum; statements: UseStatementType[] }> {
        const groups = new Map<
            string,
            { groupKey: string; groupLoc: UseStatementType["groupLoc"]; kind: IdentifierKindEnum; statements: UseStatementType[] }
        >();

        for (const statement of useStatements) {
            const groupKey = this.getUseStatementGroupKey(statement);
            const existingGroup = groups.get(groupKey);
            if (existingGroup) {
                existingGroup.statements.push(statement);
                continue;
            }

            groups.set(groupKey, {
                groupKey,
                groupLoc: statement.groupLoc,
                kind: statement.kind,
                statements: [statement],
            });
        }

        return Array.from(groups.values()).sort((a, b) => a.groupLoc.start - b.groupLoc.start);
    }

    /**
     * Returns all use statements that belong to the same group as the given statement.
     * @param useStatements All use statements parsed from the file
     * @param statement The reference statement whose group members should be returned
     * @returns Array of use statements sharing the same group key
     */
    protected getGroupedUseStatements(useStatements: UseStatementType[], statement: UseStatementType): UseStatementType[] {
        const groupKey = this.getUseStatementGroupKey(statement);
        return useStatements.filter((useStatement) => this.getUseStatementGroupKey(useStatement) === groupKey);
    }

    /**
     * Generates a stable lookup key for grouping use statements by their source location, kind, and prefix.
     * @param statement The use statement to generate a key for
     * @returns A composite string key identifying the group
     */
    protected getUseStatementGroupKey(statement: UseStatementType): string {
        return [statement.groupLoc.start, statement.groupLoc.end, statement.kind, statement.groupPrefix ?? ""].join(":");
    }

    /**
     * Renders a single use statement back to its PHP source text.
     * @param statement The use statement to render
     * @returns The rendered `use ...;` string
     */
    protected renderUseStatement(statement: UseStatementType): string {
        return this.renderSingleUseStatement(statement.name, statement.kind, statement.alias);
    }

    /**
     * Renders a use statement from individual components.
     * @param name The fully qualified name to import
     * @param kind The identifier kind (Oop, Function, or Constant)
     * @param alias Optional alias declared with `as`
     * @returns The rendered `use ...;` string
     */
    protected renderSingleUseStatement(name: string, kind: IdentifierKindEnum, alias: string | null): string {
        const useType = getUseTypeByKind(kind);
        const aliasText = alias ? ` as ${alias}` : "";
        return `use ${useType}${name}${aliasText};`;
    }

    /**
     * Renders a group of use statements, preserving grouped syntax when applicable.
     * Falls back to individual `use` lines when statements are ungrouped or only one remains.
     * @param statements The use statements to render as a group
     * @returns The rendered use statement block
     */
    protected renderUseStatementGroup(statements: UseStatementType[]): string {
        if (statements.length === 0) {
            return "";
        }
        if (statements.length === 1) {
            return this.renderUseStatement(statements[0]);
        }

        const [firstStatement] = statements;
        const groupPrefix = firstStatement.groupPrefix;
        if (!firstStatement.grouped || !groupPrefix) {
            return statements.map((statement) => this.renderUseStatement(statement)).join("\n");
        }

        const useType = getUseTypeByKind(firstStatement.kind);
        const items = statements
            .map((statement) => {
                const relativeName = statement.name.startsWith(`${groupPrefix}\\`) ? statement.name.slice(groupPrefix.length + 1) : statement.name;
                const aliasText = statement.alias ? ` as ${statement.alias}` : "";
                return `${relativeName}${aliasText}`;
            })
            .join(", ");

        return `use ${useType}${groupPrefix}\\{${items}};`;
    }

    /**
     * Replaces a grouped use statement in the file content with the rendered replacement statements.
     * Removes the entire block (including trailing linebreaks) if no replacement statements remain.
     * @param content The file content to modify
     * @param statement A use statement from the group, providing the group location
     * @param replacementStatements The statements to render in place of the original group
     * @returns The updated file content
     */
    protected replaceUseStatementGroup(content: string, statement: UseStatementType, replacementStatements: UseStatementType[]): string {
        const replacement = this.renderUseStatementGroup(replacementStatements);
        if (replacement === "") {
            return this.removeUseStatementBlock(content, statement.groupLoc);
        }

        return content.slice(0, statement.groupLoc.start) + replacement + content.slice(statement.groupLoc.end);
    }

    /**
     * Removes a use statement block from the content, including trailing linebreak characters.
     * @param content The file content to modify
     * @param loc The character offset range of the use statement block
     * @returns The updated file content
     */
    private removeUseStatementBlock(content: string, loc: UseStatementType["groupLoc"]): string {
        let end = loc.end;
        while (end < content.length && (content[end] === "\r" || content[end] === "\n")) {
            end++;
        }

        return content.slice(0, loc.start) + content.slice(end);
    }

    /**
     * Extracts the namespace portion from a fully qualified import name (everything before the last segment).
     * @param fullName The fully qualified name (e.g. `App\Models\User`)
     * @returns The namespace part (e.g. `App\Models`), or an empty string if no namespace exists
     */
    private getImportedNamespace(fullName: string): string {
        const importedSegments = fullName.split("\\");
        if (importedSegments.length < 2) {
            return "";
        }

        return importedSegments.slice(0, -1).join("\\");
    }

    /**
     * Sorts use statement groups by kind (Oop → Function → Constant) and alphabetically within each kind.
     * Returns one joined text section per kind, separated by double linebreaks.
     * @param useStatementGroups The grouped use statements to sort
     * @param content The file content (used to extract the original text of each group)
     * @param lineBreak The linebreak style used in the file
     * @returns Array of sorted text sections, one per use statement kind
     */
    private getSortedUseStatementSections(
        useStatementGroups: Array<{
            groupKey: string;
            groupLoc: UseStatementType["groupLoc"];
            kind: IdentifierKindEnum;
            statements: UseStatementType[];
        }>,
        content: string,
        lineBreak: string,
    ): string[] {
        const orderedGroups = [...useStatementGroups].sort((a, b) => {
            const kindOrder = this.getUseStatementSortOrder(a.kind) - this.getUseStatementSortOrder(b.kind);
            if (kindOrder !== 0) {
                return kindOrder;
            }

            const aText = content.slice(a.groupLoc.start, a.groupLoc.end).trim();
            const bText = content.slice(b.groupLoc.start, b.groupLoc.end).trim();
            return aText.localeCompare(bText);
        });

        const byKind = new Map<IdentifierKindEnum, string[]>();
        for (const group of orderedGroups) {
            const text = content.slice(group.groupLoc.start, group.groupLoc.end).trim();
            const existing = byKind.get(group.kind) ?? [];
            existing.push(text);
            byKind.set(group.kind, existing);
        }

        const sections: string[] = [];
        for (const kind of [IdentifierKindEnum.Oop, IdentifierKindEnum.Function, IdentifierKindEnum.Constant]) {
            const lines = byKind.get(kind);
            if (!lines || lines.length === 0) {
                continue;
            }

            sections.push(lines.join(lineBreak));
        }

        return sections;
    }

    /**
     * Returns the numeric sort order for a use statement kind.
     * Oop = 0, Function = 1, Constant = 2.
     * @param kind The identifier kind to get the sort order for
     * @returns Numeric sort priority
     */
    private getUseStatementSortOrder(kind: IdentifierKindEnum): number {
        switch (kind) {
            case IdentifierKindEnum.Function:
                return 1;
            case IdentifierKindEnum.Constant:
                return 2;
            default:
                return 0;
        }
    }

    /**
     * Creates a parser instance and ensures that the PHP source can be analysed safely.
     * @param content The PHP source code to parse
     * @returns A parseable PhpParser instance
     * @throws Error when the content cannot be parsed safely
     */
    protected getCheckedParser(content: string): PhpParser {
        const parser = new PhpParser(content);
        if (!parser.isParseable()) {
            throw new Error(parser.getParseError() ?? "Unable to parse the PHP file.");
        }

        return parser;
    }
}
