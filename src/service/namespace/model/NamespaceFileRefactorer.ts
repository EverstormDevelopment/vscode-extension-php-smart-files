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
     * @param oldUri The original URI of the file before moving/renaming
     * @param newUri The new URI of the file after moving/renaming
     * @returns Promise resolving to true if refactoring was successful, false otherwise
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
     * @param content The original file content
     * @param refactorDetails Details about what needs to be refactored
     * @returns The refactored content
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
     * @param content The original file content
     * @param refactorDetails Details about what needs to be refactored
     * @returns The content with updated namespace
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
     * @param content The original file content
     * @param refactorDetails Details about what needs to be refactored
     * @returns The content with updated definition
     * @throws Error if the new identifier is invalid or if no valid definition is found
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

    private refactorUseStatements(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const nonQualifiedReferences = this.getNonQualifiedReferences(content);
        if (nonQualifiedReferences.length === 0) {
            return content;
        }

        content = this.addUseStatements(content, refactorDetails.oldNamespace, nonQualifiedReferences);
        content = this.removeUseStatements(content, refactorDetails.newNamespace, nonQualifiedReferences);

        return content;
    }

    private addUseStatements(content: string, namespace: string, nonQualifiedReferences: string[]): string {
        for (const identifier of nonQualifiedReferences) {
            content = this.addUseStatement(content, namespace, identifier);
        }
        return content;
    }

    private removeUseStatements(content: string, namespace: string, nonQualifiedReferences: string[]): string {
        for (const identifier of nonQualifiedReferences) {
            content = this.removeUseStatement(content, namespace, identifier);
        }
        return content;
    }

    private getNonQualifiedReferences(content: string): string[] {
        const regex = this.getNonQualifiedReferenceRegExp();
        const matches = Array.from(content.matchAll(regex));

        const extractedNames = matches.map((match) => match.slice(1).find(Boolean)).filter(Boolean) as string[];

        const classNames = new Set(extractedNames);
        return Array.from(classNames);
    }

    private addUseStatement(content: string, namespace: string, identifier: string): string {
        const fullQualifiedNamespace = `${namespace}\\${identifier}`;
        const hasUseStatementRegExp = this.getUseStatementByIdentiferRegExp(identifier);
        if (hasUseStatementRegExp.test(content)) {
            return content;
        }

        const namespaceDeclarationRegExp = this.getNamespaceDeclarationRegExp();
        const namespaceDeclarationMatch = content.match(namespaceDeclarationRegExp);
        if (!namespaceDeclarationMatch) {
            return content;
        }

        const useStatement = `use ${fullQualifiedNamespace};`;

        const lastUseStatementRegExp = this.getLastUseStatementRegExp();
        const lastUseStatementMatch = content.match(lastUseStatementRegExp);
        if (lastUseStatementMatch) {
            const lastUseMatch = lastUseStatementMatch[lastUseStatementMatch.length - 1];
            return content.replace(lastUseMatch, `${lastUseMatch}\n${useStatement}`);
        }

        return content.replace(namespaceDeclarationMatch[0], `${namespaceDeclarationMatch[0]}\n\n${useStatement}`);
    }

    private removeUseStatement(content: string, namespace: string, identifier: string): string {
        const fullQualifiedNamespace = `${namespace}\\${identifier}`;
        const useStatementRegExp = this.getUseStatementRegExp(fullQualifiedNamespace);
        const useStatementWithLineBreakRegExp = new RegExp(
            `${useStatementRegExp.source}\\s*?\\r?\\n?\\r?`,
            useStatementRegExp.flags
        );

        return content.replace(useStatementWithLineBreakRegExp, "");
    }
}
