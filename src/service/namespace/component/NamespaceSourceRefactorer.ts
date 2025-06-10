import * as vscode from "vscode";
import { ReservedKeywords } from "../../../utils/php/ReservedKeywords";
import { escapeRegExp } from "../../../utils/regexp/escapeRegExp";
import { NamespaceRefactorerAbstract } from "../abstract/NamespaceRefactorerAbstract";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";
import { GlobalFunctions } from "../../../utils/php/GlobalFunctions";

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
        if (refactorDetails.hasIdentifierChanged) {
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

        const newDefinition = `${definitionMatch[1]} ${refactorDetails.new.identifier}`;
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

        const nonQualifiedReferences = references.filter((reference) => reference !== refactorDetails.old.identifier);
        content = this.addUseStatements(content, refactorDetails.old.namespace, nonQualifiedReferences);
        content = this.removeUseStatements(content, refactorDetails.new.namespace, nonQualifiedReferences);
        return content;
    }

    /**
     * Adds `use` statements for non-qualified references.
     * @param content The original file content.
     * @param namespace The namespace to add `use` statements for.
     * @param nonQualifiedReferences A list of non-qualified references to add.
     * @returns The content with added `use` statements.
     */
    private addUseStatements(content: string, namespace: string, nonQualifiedReferences: string[]): string {
        for (const identifier of nonQualifiedReferences) {
            content = this.addUseStatement(content, namespace, identifier);
        }
        return content;
    }

    /**
     * Removes `use` statements for non-qualified references.
     * @param content The original file content.
     * @param namespace The namespace to remove `use` statements for.
     * @param nonQualifiedReferences A list of non-qualified references to remove.
     * @returns The content with removed `use` statements.
     */
    private removeUseStatements(content: string, namespace: string, nonQualifiedReferences: string[]): string {
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
    private getNonQualifiedReferences(content: string): string[] {
        const regex = this.namespaceRegExpProvider.getNonQualifiedOopReferenceRegExp();
        const matches = Array.from(content.matchAll(regex));
        const extractedNames = matches.map((match) => match.slice(1).find(Boolean)).filter(Boolean) as string[];
        const filteredClassNames = extractedNames.filter((name) => {
            return !ReservedKeywords.has(name.toLowerCase()) && !GlobalFunctions.has(name.toLowerCase());
        });

        const classNames = new Set(filteredClassNames);
        return Array.from(classNames);
    }
}
