import * as vscode from "vscode";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailType";
import { NamespaceRefactorerAbstract } from "./NamespaceRefactorerAbstract";

/**
 * Handles the refactoring of namespace declarations and class identifiers in PHP files
 * when a file is moved or renamed.
 */
export class NamespaceFileRefactorer extends NamespaceRefactorerAbstract {
    /**
     * Refactors namespace and class identifiers in a PHP file after it has been moved or renamed.
     * @param oldUri The original URI of the file before moving/renaming.
     * @param newUri The new URI of the file after moving/renaming.
     * @returns Promise resolving to true if refactoring was successful, false otherwise.
     */
    public async refactor(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<boolean> {
        try {
            const refactorDetails = await this.getRefactorDetails(oldUri, newUri);
            if (!refactorDetails.hasNamespaces || !refactorDetails.hasChanged) {
                return false;
            }

            const fileContent = await this.getFileContent(refactorDetails.newUri);
            const updatedContent = this.refactorContent(fileContent, refactorDetails);
            if (updatedContent === fileContent) {
                return false;
            }

            await this.updateFileContent(refactorDetails.newUri, updatedContent);
            return true;
        } catch (error) {
            const errorDetails = error instanceof Error ? error.message : String(error);
            const errorMessage = vscode.l10n.t("Error during namespace refactoring: {0}", errorDetails);
            vscode.window.showErrorMessage(errorMessage);
            return false;
        }
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
            content = this.refactorIdentifier(content, refactorDetails.newNamespace, refactorDetails);
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
        const namespaceRegExp = this.getNamespaceDeclarationRegExp();
        const hasMatch = namespaceRegExp.test(content);
        if (!hasMatch) {
            return content;
        }

        return content.replace(namespaceRegExp, `namespace ${refactorDetails.newNamespace};`);
    }

    /**
     * Refactors the class/interface/trait definition to use the new identifier.
     * Ensures the new identifier is valid and updates the definition accordingly.
     * @param content The original file content.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The content with the updated definition.
     * @throws Error if the new identifier is invalid or if no valid definition is found.
     */
    private refactorDefinition(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const validationRegExp = this.getIdentifierValidationRegExp();
        const newIdentifier = refactorDetails.newIdentifier;
        if (!validationRegExp.test(newIdentifier)) {
            const message = vscode.l10n.t(
                "The provided name '{0}' is not a valid PHP identifier. The refactoring process has been canceled.",
                newIdentifier
            );
            throw new Error(message);
        }

        const definitionRegExp = this.getDefinitionRegExp();
        const definitionMatch = definitionRegExp.exec(content);
        if (!definitionMatch) {
            const message = vscode.l10n.t(
                "Unable to locate a valid definition. The refactoring process has been canceled."
            );
            throw new Error(message);
        }

        const newDefinition = `${definitionMatch[1]} ${refactorDetails.newIdentifier}`;
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

        content = this.addUseStatements(content, refactorDetails.oldNamespace, nonQualifiedReferences);
        content = this.removeUseStatements(content, refactorDetails.newNamespace, nonQualifiedReferences);

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
        const regex = this.getNonQualifiedReferenceRegExp();
        const matches = Array.from(content.matchAll(regex));

        const extractedNames = matches.map((match) => match.slice(1).find(Boolean)).filter(Boolean) as string[];

        const classNames = new Set(extractedNames);
        return Array.from(classNames);
    }

    /**
     * Creates a regular expression to match PHP class/interface/enum/trait definitions.
     * Used to find and update the main definition in the file.
     * @returns A regular expression that captures the definition type and name.
     */
    protected getDefinitionRegExp(): RegExp {
        return new RegExp(`\\b(class|interface|enum|trait)\\s+([\\p{L}_][\\p{L}\\d_]*)`, "gu");
    }

    /**
     * Creates a regular expression to validate PHP identifiers.
     * Ensures the identifier follows PHP naming rules.
     * @returns A regular expression for validating PHP identifiers.
     */
    protected getIdentifierValidationRegExp(): RegExp {
        return new RegExp(`^[\\p{L}_][\\p{L}\\d_]*$`, "u");
    }

    /**
     * Creates a regular expression to match non-qualified references in PHP code.
     * Used to find references that need to be updated to fully qualified names.
     * @returns A regular expression for matching non-qualified references.
     */
    private getNonQualifiedReferenceRegExp(): RegExp {
        const patterns = [
            // Attribute annotations (PHP 8+)
            "#\\[\\s*([\\p{L}_][\\p{L}\\d_]*)",
            // Extends/implements clauses
            "(?:extends|implements)\\s+([\\p{L}_][\\p{L}\\d_]*)(?!\\s*\\\\)",
            // New instantiations
            "new\\s+([\\p{L}_][\\p{L}\\d_]*)(?!\\s*\\\\)",
            // use statements (single-level namespaces only)
            "use\\s+([\\p{L}_][\\p{L}\\d_]*)\\s*;",
            // Static access
            "\\b([\\p{L}_][\\p{L}\\d_]*)(?!\\s*\\\\)::",
        ];

        // Combine patterns with OR
        return new RegExp(patterns.join("|"), "gu");
    }
}
