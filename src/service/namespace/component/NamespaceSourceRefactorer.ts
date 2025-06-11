import * as vscode from "vscode";
import { GlobalFunctions } from "../../../utils/php/GlobalFunctions";
import { ReservedKeywords } from "../../../utils/php/ReservedKeywords";
import { escapeRegExp } from "../../../utils/regexp/escapeRegExp";
import { NamespaceRefactorerAbstract } from "../abstract/NamespaceRefactorerAbstract";
import { IdentifierKindEnum } from "../enum/IdentifierKindEnum";
import { IdentifierType } from "../type/IdentifierType";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";

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
     * Performs the actual refactoring of the file.
     * Reads the file content, updates it, and writes it back.
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
     * Performs content refactoring based on the refactor details.
     * Handles namespace changes, use statements, and identifier updates.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The refactored content.
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
     * Refactors the namespace declaration in the file content.
     * Updates the namespace declaration to reflect the new namespace.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The content with the updated namespace declaration.
     */
    private refactorNamespace(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const namespaceRegExp = this.namespaceRegExpProvider.getNamespaceDeclarationRegExp();
        const hasMatch = namespaceRegExp.test(content);
        if (!hasMatch) {
            return content;
        }

        return content.replace(namespaceRegExp, `namespace ${refactorDetails.new.namespace};`);
    }

    /**
     * Refactors the class, interface, or trait definition in the file content to
     * reflect the new identifier.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The content with the updated definition.
     * @throws Error if no valid definition is found in the content.
     */
    private refactorDefinition(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const definitionRegExp = this.namespaceRegExpProvider.getDefinitionRegExp();
        const definitionMatch = definitionRegExp.exec(content);
        if (!definitionMatch) {
            const message = vscode.l10n.t(
                "Unable to locate a valid definition. The refactoring process has been canceled."
            );
            throw new Error(message);
        }

        const newDefinition = `${definitionMatch[1]} ${refactorDetails.new.fileIdentifier.name}`;
        return content.replace(definitionRegExp, newDefinition);
    }

    /**
     * Refactors `use` statements in the file content.
     * Adds or removes `use` statements based on the namespace changes.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The content with updated `use` statements.
     */
    private refactorUseStatements(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const references = this.getNonQualifiedReferences(content);
        if (references.length === 0) {
            return content;
        }

        const nonQualifiedReferences = references.filter(
            (reference) => reference.name !== refactorDetails.old.fileIdentifier.name
        );
        content = this.addUseStatements(content, refactorDetails.old.namespace, nonQualifiedReferences);
        content = this.removeUseStatements(content, refactorDetails.new.namespace, nonQualifiedReferences);
        return content;
    }

    /**
     * Adds use statements for the given non-qualified references to the file content.
     * @param content The original file content.
     * @param namespace The namespace to use for the use statements.
     * @param nonQualifiedReferences List of non-qualified references to add as use statements.
     * @returns The content with added use statements.
     */
    private addUseStatements(content: string, namespace: string, nonQualifiedReferences: IdentifierType[]): string {
        for (const identifier of nonQualifiedReferences) {
            content = this.addUseStatement(content, namespace, identifier);
        }
        return content;
    }

    /**
     * Removes use statements for the given non-qualified references from the file content.
     * @param content The original file content.
     * @param namespace The namespace to remove from the use statements.
     * @param nonQualifiedReferences List of non-qualified references to remove from use statements.
     * @returns The content with removed use statements.
     */
    private removeUseStatements(content: string, namespace: string, nonQualifiedReferences: IdentifierType[]): string {
        for (const identifier of nonQualifiedReferences) {
            content = this.removeUseStatement(content, namespace, identifier);
        }
        return content;
    }

    /**
     * Refactors partially qualified namespace references in the file content.
     * Updates references based on namespace changes, either by making them fully qualified
     * or by simplifying them when they're part of the new namespace.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The content with updated partially qualified namespace references.
     */
    private refactorPartialQualified(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const pqnRegExp = this.namespaceRegExpProvider.getPartiallyQualifiedReferenceRegExp();
        const escapedNewNamespace = escapeRegExp(`${refactorDetails.new.namespace}\\`);
        const newNamespaceMatchRegExp = new RegExp(`^${escapedNewNamespace}`, "u");

        return content.replace(pqnRegExp, (match: string, ...groups: (string | undefined)[]) => {
            const partiallyQualifiedReference = groups.find((group) => group !== undefined);
            if (!partiallyQualifiedReference) {
                return match;
            }

            const qualifiedReference = `${refactorDetails.old.namespace}\\${partiallyQualifiedReference}`;
            const isSubNamespace = !!qualifiedReference.match(newNamespaceMatchRegExp);
            if (!isSubNamespace) {
                const fullyQualifiedReference = `\\${qualifiedReference}`;
                return match.replace(partiallyQualifiedReference, fullyQualifiedReference);
            }

            const newReference = qualifiedReference.replace(newNamespaceMatchRegExp, "");
            return match.replace(partiallyQualifiedReference, newReference);
        });
    }

    /**
     * Extracts non-qualified references from the file content.
     * Identifies class/interface/trait names that are used without a namespace.
     * @param content The original file content.
     * @returns A list of unique non-qualified references.
     */
    private getNonQualifiedReferences(content: string): IdentifierType[] {
        const referencePatterns: [RegExp, IdentifierKindEnum][] = [
            [this.namespaceRegExpProvider.getNonQualifiedOopReferenceRegExp(), IdentifierKindEnum.Oop],
            [this.namespaceRegExpProvider.getNonQualifiedFunctionReferenceRegExp(), IdentifierKindEnum.Function],
            [this.namespaceRegExpProvider.getNonQualifiedConstantReferenceRegExp(), IdentifierKindEnum.Constant],
        ];

        let excludedIdentifiers = new Set<string>();
        const result: IdentifierType[] = [];

        for (const [regExp, kind] of referencePatterns) {
            const identifiers = this.extractNonQualifiedIdentifiers(content, regExp, excludedIdentifiers);
            for (const identifier of identifiers) {
                result.push({ name: identifier, kind });
                excludedIdentifiers.add(identifier);
            }
        }

        return result;
    }

    /**
     * Extracts unique non-qualified identifiers from the file content using the provided RegExp.
     * Filters out reserved keywords, global functions, and excluded names.
     * @param content The original file content.
     * @param regExp The RegExp to match identifiers.
     * @param exclude Set of names to exclude (already used).
     * @returns Array of unique identifier names.
     */
    private extractNonQualifiedIdentifiers(content: string, regExp: RegExp, exclude: Set<string>): string[] {
        const matches = Array.from(content.matchAll(regExp))
            .map((match) => match.slice(1).find(Boolean))
            .filter((name): name is string => !!name)
            .filter((name) => {
                const lowercaseName = name.toLowerCase();
                return (
                    !ReservedKeywords.has(lowercaseName) && !GlobalFunctions.has(lowercaseName) && !exclude.has(name)
                );
            });

        const uniqueMatches = new Set(matches);
        return Array.from(uniqueMatches);
    }
}
