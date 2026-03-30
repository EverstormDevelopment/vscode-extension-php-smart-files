import * as vscode from "vscode";
import { escapeRegExp } from "../../../utils/regexp/escapeRegExp";
import { NamespaceRefactorerAbstract } from "../abstract/NamespaceRefactorerAbstract";
import { IdentifierKindEnum } from "../enum/IdentifierKindEnum";
import { NameResolutionEnum } from "../enum/NameResolutionEnum";
import { PhpAstTraverser } from "../parser/PhpAstTraverser";
import { PhpParser } from "../parser/PhpParser";
import { NamespaceRegExpProvider } from "../provider/NamespaceRegExpProvider";
import { IdentifierType } from "../type/IdentifierType";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";
import { OffsetLocType } from "../type/OffsetLocType";

/**
 * Handles the refactoring of namespace declarations and class identifiers in PHP files
 * when a file is moved or renamed.
 */
export class NamespaceSourceRefactorer extends NamespaceRefactorerAbstract {
    constructor(protected readonly namespaceRegExpProvider: NamespaceRegExpProvider) {
        super(namespaceRegExpProvider);
    }

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
        const updatedContent = this.refactorContent(fileContent, refactorDetails);
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
    private refactorContent(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        if (refactorDetails.hasNamespaceChanged) {
            content = this.refactorNamespace(content, refactorDetails);
            content = this.refactorUseStatements(content, refactorDetails);
            content = this.refactorPartialQualified(content, refactorDetails);
        }
        if (refactorDetails.hasFileIdentifierChanged) {
            content = this.refactorDefinition(content, refactorDetails);
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
    private refactorNamespace(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const namespaceLoc = new PhpParser(content).getNamespaceLoc();
        if (!namespaceLoc) {
            return content;
        }

        return (
            content.slice(0, namespaceLoc.start) +
            `namespace ${refactorDetails.new.namespace};` +
            content.slice(namespaceLoc.end)
        );
    }

    /**
     * Replaces the class/interface/trait/enum name token using the AST-provided offset position.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The content with the updated definition name.
     * @throws Error if no matching top-level definition is found.
     */
    private refactorDefinition(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const identifierLocs = new PhpParser(content).getTopLevelIdentifierLocs();
        const identifierLoc = identifierLocs.find(
            (id) => id.name === refactorDetails.old.fileIdentifier.name
        );

        if (!identifierLoc) {
            const message = vscode.l10n.t(
                "Unable to locate a valid definition. The refactoring process has been canceled."
            );
            throw new Error(message);
        }

        return (
            content.slice(0, identifierLoc.nameLoc.start) +
            refactorDetails.new.fileIdentifier.name +
            content.slice(identifierLoc.nameLoc.end)
        );
    }

    /**
     * Adds and removes use statements based on unqualified name references found via AST traversal.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The content with updated use statements.
     */
    private refactorUseStatements(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const references = this.getNonQualifiedReferences(content);
        if (references.length === 0) {
            return content;
        }

        const nonQualifiedReferences = references.filter(
            (reference) => reference.name !== refactorDetails.old.fileIdentifier.name
        );

        for (const identifier of nonQualifiedReferences) {
            content = this.addUseStatement(content, refactorDetails.old.namespace, identifier);
        }
        for (const identifier of nonQualifiedReferences) {
            content = this.removeUseStatement(content, refactorDetails.new.namespace, identifier);
        }

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
    private refactorPartialQualified(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const parser = new PhpParser(content);
        const qnRefs = new PhpAstTraverser(parser.getAST())
            .getNameReferences(false)
            .filter((ref) => ref.resolution === NameResolutionEnum.Qn)
            .sort((a, b) => b.loc.start - a.loc.start);

        if (qnRefs.length === 0) {
            return content;
        }

        const escapedNewNamespace = escapeRegExp(`${refactorDetails.new.namespace}\\`);
        const newNamespaceMatchRegExp = new RegExp(`^${escapedNewNamespace}`, "u");

        const replacements: Array<{ loc: OffsetLocType; newText: string }> = [];
        for (const ref of qnRefs) {
            const qualifiedReference = `${refactorDetails.old.namespace}\\${ref.name}`;
            const isSubNamespace = newNamespaceMatchRegExp.test(qualifiedReference);
            const newText = isSubNamespace
                ? qualifiedReference.replace(newNamespaceMatchRegExp, "")
                : `\\${qualifiedReference}`;
            replacements.push({ loc: ref.loc, newText });
        }

        for (const { loc, newText } of replacements) {
            content = content.slice(0, loc.start) + newText + content.slice(loc.end);
        }

        return content;
    }

    /**
     * Extracts unqualified name references from the file via AST traversal, classified by kind.
     * Replaces the prior regex + GlobalReservedService approach. Built-in types are already
     * filtered inside PhpAstTraverser. Config flags control function and constant inclusion.
     * @param content The file content to analyse.
     * @returns Deduplicated list of unqualified references.
     */
    private getNonQualifiedReferences(content: string): IdentifierType[] {
        const parser = new PhpParser(content);
        const allRefs = new PhpAstTraverser(parser.getAST()).getNameReferences(true);

        const config = vscode.workspace.getConfiguration("phpSmartFiles");
        const includeFunctions = config.get<boolean>("refactorNamespacesIncludeFunctions", true);
        const includeConstants = config.get<boolean>("refactorNamespacesIncludeConstants", true);

        return allRefs
            .filter((ref) => ref.resolution === NameResolutionEnum.Uqn)
            .filter((ref) => {
                if (ref.kind === IdentifierKindEnum.Function) {
                    return includeFunctions;
                }
                if (ref.kind === IdentifierKindEnum.Constant) {
                    return includeConstants;
                }
                return true;
            })
            .map((ref) => ({ name: ref.name, kind: ref.kind }));
    }
}
