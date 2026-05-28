import * as vscode from "vscode";
import { getExcludePattern } from "../../../utils/filesystem/getExcludePattern";
import { NamespaceRefactorerAbstract } from "../abstract/NamespaceRefactorerAbstract";
import { IdentifierKindEnum } from "../enum/IdentifierKindEnum";
import { NameResolutionEnum } from "../enum/NameResolutionEnum";
import { PhpAstTraverser } from "../parser/PhpAstTraverser";
import { PhpDocTypeExtractor } from "../parser/PhpDocTypeExtractor";
import { PhpParser } from "../parser/PhpParser";
import { IdentifierType } from "../type/IdentifierType";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";
import { OffsetLocType } from "../type/OffsetLocType";

/**
 * Handles the refactoring of namespace declarations and class identifiers in PHP files
 * when a file is moved or renamed.
 */
export class NamespaceSourceRefactorer extends NamespaceRefactorerAbstract {
    /**
     * Performs the refactoring based on the provided details.
     * @param refactorDetails The details for the refactoring operation.
     * @returns True if refactoring was successfully performed, otherwise False.
     */
    public async refactor(refactorDetails: NamespaceRefactorDetailsType): Promise<boolean> {
        if (!refactorDetails.hasNamespaces || !refactorDetails.hasChanged) {
            return false;
        }

        try {
            return await this.refactorFile(refactorDetails);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showWarningMessage(errorMessage);
            return false;
        }
    }

    /**
     * Reads the file, applies all content transformations, and writes back if changed.
     * @param refactorDetails The details for the refactoring operation.
     * @returns True if changes were made, otherwise False.
     */
    private async refactorFile(refactorDetails: NamespaceRefactorDetailsType): Promise<boolean> {
        const fileContent = await this.getFileContent(refactorDetails.new.uri);
        const updatedContent = await this.refactorContent(fileContent, refactorDetails);
        if (updatedContent === fileContent) {
            return false;
        }

        await this.setFileContent(refactorDetails.new.uri, updatedContent);
        return true;
    }

    /**
     * Applies all namespace and identifier transformations to the file content.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The fully refactored content.
     */
    private async refactorContent(content: string, refactorDetails: NamespaceRefactorDetailsType): Promise<string> {
        if (refactorDetails.hasNamespaceChanged) {
            content = this.refactorNamespace(content, this.getCheckedParser(content), refactorDetails);
            content = await this.refactorUseStatements(content, this.getCheckedParser(content), refactorDetails);
            content = this.refactorPartialQualified(content, this.getCheckedParser(content), refactorDetails);
        }
        if (refactorDetails.hasFileIdentifierChanged) {
            content = this.refactorDefinition(content, this.getCheckedParser(content), refactorDetails);
            content = this.refactorIdentifier(content, refactorDetails.new.namespace, refactorDetails);
        }
        return content;
    }

    /**
     * Replaces the namespace declaration using the AST-provided offset position.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The content with the updated namespace declaration.
     */
    private refactorNamespace(content: string, parser: PhpParser, refactorDetails: NamespaceRefactorDetailsType): string {
        const namespaceLoc = parser.getNamespaceLoc();
        if (!namespaceLoc) {
            return content;
        }

        return content.slice(0, namespaceLoc.start) + `namespace ${refactorDetails.new.namespace};` + content.slice(namespaceLoc.end);
    }

    /**
     * Replaces the class/interface/trait/enum name token using the AST-provided offset position.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The content with the updated definition name.
     * @throws Error if no matching top-level definition is found.
     */
    private refactorDefinition(content: string, parser: PhpParser, refactorDetails: NamespaceRefactorDetailsType): string {
        const identifierLocs = parser.getTopLevelIdentifierLocs();
        const identifierLoc = identifierLocs.find((id) => id.name === refactorDetails.old.fileIdentifier.name);

        if (!identifierLoc) {
            const message = vscode.l10n.t("Unable to locate a valid definition. The refactoring process has been canceled.");
            throw new Error(message);
        }

        return content.slice(0, identifierLoc.nameLoc.start) + refactorDetails.new.fileIdentifier.name + content.slice(identifierLoc.nameLoc.end);
    }

    /**
     * Adds and removes use statements based on unqualified name references found via AST traversal.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The content with updated use statements.
     */
    private async refactorUseStatements(content: string, parser: PhpParser, refactorDetails: NamespaceRefactorDetailsType): Promise<string> {
        const references = await this.getNonQualifiedReferences(content, parser, refactorDetails);
        const nonQualifiedReferences = references.filter((reference) => reference.name !== refactorDetails.old.fileIdentifier.name);

        for (const identifier of nonQualifiedReferences) {
            content = this.addUseStatement(content, refactorDetails.old.namespace, identifier);
        }
        for (const identifier of nonQualifiedReferences) {
            content = this.removeUseStatement(content, refactorDetails.new.namespace, identifier);
        }

        content = this.removeOwnNamespaceUseStatements(content, refactorDetails.new.namespace);

        return this.orderUseStatements(content);
    }

    /**
     * Updates partially qualified namespace references (e.g. `Sub\Foo`) using AST-provided offsets.
     * All QN references are expanded to FQN (old namespace + ref) and then either made explicit
     * with a leading backslash or simplified relative to the new namespace.
     * Replacements are applied in reverse offset order to preserve correctness.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The content with updated partially qualified references.
     */
    private refactorPartialQualified(content: string, parser: PhpParser, refactorDetails: NamespaceRefactorDetailsType): string {
        const qnRefs = new PhpAstTraverser(parser.getAST(), content)
            .getNameReferences(false)
            .filter((ref) => ref.resolution === NameResolutionEnum.Qn)
            .sort((a, b) => b.loc.start - a.loc.start);

        if (qnRefs.length === 0) {
            return content;
        }

        const newNamespacePrefix = `${refactorDetails.new.namespace}\\`;

        const replacements: Array<{ loc: OffsetLocType; newText: string }> = [];
        for (const ref of qnRefs) {
            const qualifiedReference = `${refactorDetails.old.namespace}\\${ref.name}`;
            const isSubNamespace = qualifiedReference.startsWith(newNamespacePrefix);
            const newText = isSubNamespace ? qualifiedReference.slice(newNamespacePrefix.length) : `\\${qualifiedReference}`;
            replacements.push({ loc: ref.loc, newText });
        }

        for (const { loc, newText } of replacements) {
            content = content.slice(0, loc.start) + newText + content.slice(loc.end);
        }

        return content;
    }

    /**
     * Extracts unqualified name references from the file via AST traversal, classified by kind.
     * Built-in types are already filtered inside PhpAstTraverser. Config flags control
     * function and constant inclusion.
     * @param content The file content to analyse.
     * @returns Deduplicated list of unqualified references.
     */
    private async getNonQualifiedReferences(content: string, parser: PhpParser, refactorDetails: NamespaceRefactorDetailsType): Promise<IdentifierType[]> {
        const allRefs = new PhpAstTraverser(parser.getAST(), content).getNameReferences(true);

        const config = vscode.workspace.getConfiguration("phpSmartFiles");
        const includeFunctions = config.get<boolean>("refactorNamespacesIncludeFunctions", true);
        const includeConstants = config.get<boolean>("refactorNamespacesIncludeConstants", true);
        const includeDocblockTypes = config.get<boolean>("refactorNamespacesIncludeDocblockTypes", true);
        const needsDefinitionLookup = allRefs.some(
            (ref) => ref.resolution === NameResolutionEnum.Uqn && (ref.kind === IdentifierKindEnum.Function || ref.kind === IdentifierKindEnum.Constant),
        );
        const importableDefinitions = needsDefinitionLookup ? await this.getImportableDefinitionsFromOldNamespace(refactorDetails) : new Set<string>();
        const docblockReferences = includeDocblockTypes ? new PhpDocTypeExtractor(content).getUnqualifiedOopReferences() : [];

        const codeReferences = allRefs
            .filter((ref) => ref.resolution === NameResolutionEnum.Uqn)
            .filter((ref) => {
                if (ref.kind === IdentifierKindEnum.Function) {
                    return includeFunctions && this.hasImportableDefinition(ref.name, ref.kind, importableDefinitions, refactorDetails);
                }
                if (ref.kind === IdentifierKindEnum.Constant) {
                    return includeConstants && this.hasImportableDefinition(ref.name, ref.kind, importableDefinitions, refactorDetails);
                }
                return true;
            })
            .map((ref) => ({ name: ref.name, kind: ref.kind }));

        return this.getDeduplicatedIdentifiers([...codeReferences, ...docblockReferences]);
    }

    /**
     * Collects function and constant definitions that actually exist in the file's old namespace.
     * Only these symbols are eligible for newly added `use function` / `use const` statements.
     * @param refactorDetails Details about the refactoring operation.
     * @returns A set of importable symbol keys in the old namespace.
     */
    private async getImportableDefinitionsFromOldNamespace(refactorDetails: NamespaceRefactorDetailsType): Promise<Set<string>> {
        const currentFileDefinitions = new Set(
            refactorDetails.identifiers
                .filter((identifier) => identifier.kind === IdentifierKindEnum.Function || identifier.kind === IdentifierKindEnum.Constant)
                .map((identifier) => this.getImportableDefinitionKey(identifier.name, identifier.kind)),
        );

        const availableDefinitions = new Set<string>();
        const phpFiles = await this.findPhpFiles(refactorDetails.new.uri);

        for (const file of phpFiles) {
            const fileContent = await this.getFileContent(file);
            const parser = new PhpParser(fileContent);
            if (!parser.isParseable()) {
                continue;
            }

            if (parser.getNamespace() !== refactorDetails.old.namespace) {
                continue;
            }

            const identifiers = parser.getTopLevelIdentifiers();
            for (const identifier of identifiers) {
                if (identifier.kind !== IdentifierKindEnum.Function && identifier.kind !== IdentifierKindEnum.Constant) {
                    continue;
                }

                const key = this.getImportableDefinitionKey(identifier.name, identifier.kind);
                if (currentFileDefinitions.has(key)) {
                    continue;
                }

                availableDefinitions.add(key);
            }
        }

        return availableDefinitions;
    }

    /**
     * Checks whether the referenced function or constant can actually be imported from the old namespace.
     * Symbols defined in the moved file itself are excluded because they move along with the file.
     * @param name The referenced symbol name.
     * @param kind The symbol kind.
     * @param availableDefinitions All matching definitions found in the old namespace.
     * @param refactorDetails Details about the refactoring operation.
     * @returns True if the symbol should receive a use statement, otherwise false.
     */
    private hasImportableDefinition(
        name: string,
        kind: IdentifierKindEnum,
        availableDefinitions: Set<string>,
        refactorDetails: NamespaceRefactorDetailsType,
    ): boolean {
        const key = this.getImportableDefinitionKey(name, kind);
        if (refactorDetails.identifiers.some((identifier) => identifier.name === name && identifier.kind === kind)) {
            return false;
        }

        return availableDefinitions.has(key);
    }

    /**
     * Builds a stable lookup key for a function or constant definition.
     * @param name The symbol name.
     * @param kind The symbol kind.
     * @returns A unique lookup key.
     */
    private getImportableDefinitionKey(name: string, kind: IdentifierKindEnum): string {
        return `${kind}:${name}`;
    }

    /**
     * Finds PHP files in the workspace that may contain definitions in the old namespace.
     * Honors the configured excluded directories and skips the moved file itself.
     * @param currentFileUri The moved file URI.
     * @returns Candidate PHP files to inspect.
     */
    protected async findPhpFiles(currentFileUri: vscode.Uri): Promise<vscode.Uri[]> {
        const config = vscode.workspace.getConfiguration("phpSmartFiles");
        const excludedFolders = config.get<string[]>("refactorNamespacesExcludeDirectories", []);

        const relativeFilePath = vscode.workspace.asRelativePath(currentFileUri.fsPath);
        const excludePattern = getExcludePattern([...excludedFolders, relativeFilePath]);

        return vscode.workspace.findFiles("**/*.php", excludePattern);
    }

    /**
     * Deduplicates identifiers by kind and name while preserving the first occurrence order.
     * @param identifiers All collected identifiers.
     * @returns Unique identifiers.
     */
    private getDeduplicatedIdentifiers(identifiers: IdentifierType[]): IdentifierType[] {
        const seen = new Set<string>();

        return identifiers.filter((identifier) => {
            const key = `${identifier.kind}:${identifier.name}`;
            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
    }
}
