import * as vscode from "vscode";
import { NamespaceRefactorerAbstract } from "../abstract/NamespaceRefactorerAbstract";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";

/**
 * Handles the refactoring of namespace declarations and class identifiers in PHP files
 * when a file is moved or renamed.
 */
export class NamespaceFileRefactorer extends NamespaceRefactorerAbstract {
    /**
     * Performs the refactoring based on the provided details.
     * @param refactorDetails The details for the refactoring operation.
     * @returns True if refactoring was successfully performed, otherwise False.
     */
    public async refactor(refactorDetails: NamespaceRefactorDetailsType): Promise<boolean> {
        try {
            if (!this.isRefactorable(refactorDetails)) {
                return false;
            }

            return await this.refactorFile(refactorDetails);
        } catch (error) {
            const errorDetails = error instanceof Error ? error.message : String(error);
            const errorMessage = vscode.l10n.t("Error during namespace refactoring: {0}", errorDetails);
            vscode.window.showErrorMessage(errorMessage);
            return false;
        }
    }

    /**
     * Checks if the file is suitable for refactoring.
     * @param refactorDetails The details for the refactoring operation.
     * @returns True if the file can be refactored, otherwise False.
     * @throws Error if the filename is not a valid PHP identifier.
     */
    private isRefactorable(refactorDetails: NamespaceRefactorDetailsType): boolean {
        if (!refactorDetails.new.isFileNameValid) {
            const message = vscode.l10n.t(
                "The provided name '{0}' is not a valid PHP identifier. The refactoring process has been canceled.",
                refactorDetails.new.fileName
            );
            throw new Error(message);
        }

        if (!refactorDetails.hasNamespaces || !refactorDetails.hasChanged) {
            return false;
        }

        return true;
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
        const nonQualifiedReferences = this.getNonQualifiedReferences(content);
        if (nonQualifiedReferences.length === 0) {
            return content;
        }

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
     * Extracts non-qualified references from the file content.
     * Identifies class/interface/trait names that are used without a namespace.
     * @param content The original file content.
     * @returns A list of unique non-qualified references.
     */
    private getNonQualifiedReferences(content: string): string[] {
        const regex = this.namespaceRegExpProvider.getNonQualifiedReferenceRegExp();
        const matches = Array.from(content.matchAll(regex));

        const extractedNames = matches.map((match) => match.slice(1).find(Boolean)).filter(Boolean) as string[];

        const classNames = new Set(extractedNames);
        return Array.from(classNames);
    }
}
