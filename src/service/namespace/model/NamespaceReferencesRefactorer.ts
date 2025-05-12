import * as vscode from "vscode";
import { getPathNormalized } from "../../../utils/filesystem/getPathNormalized";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailType";
import { NamespaceRefactorerAbstract } from "./NamespaceRefactorerAbstract";

/**
 * Handles refactoring of namespace references across multiple PHP files when a file
 * with a namespace is moved or renamed.
 */
export class NamespaceReferencesRefactorer extends NamespaceRefactorerAbstract {
    /**
     * Refactors namespace references in all PHP files within the workspace
     * after a file has been moved or renamed.
     * @param oldUri The original URI of the file before moving/renaming.
     * @param newUri The new URI of the file after moving/renaming.
     * @returns Promise resolving to true if refactoring was performed, false otherwise.
     */
    public async refactor(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<boolean> {
        const refactorDetails = await this.getRefactorDetails(oldUri, newUri);
        if (!refactorDetails.hasNamespaces || !refactorDetails.hasChanged) {
            return false;
        }

        await this.progressUpdateReferences(refactorDetails);
        return true;
    }

    /**
     * Shows a progress notification while updating references in all relevant files.
     * @param refactorDetails Details about what needs to be refactored.
     */
    private async progressUpdateReferences(refactorDetails: NamespaceRefactorDetailsType): Promise<void> {
        const options: vscode.ProgressOptions = {
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t(
                'Updating references from "{0}" to "{1}"',
                refactorDetails.oldNamespace,
                refactorDetails.newNamespace
            ),
        };

        await vscode.window.withProgress(options, async (progress) => {
            const files = await this.findFilesToRefactor(refactorDetails.newUri);
            const progressIncrement = 100 / files.length;

            for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
                const progressMessage = vscode.l10n.t("Processing file {0} of {1}", fileIndex + 1, files.length);
                progress.report({
                    increment: progressIncrement,
                    message: progressMessage,
                });

                await this.updateReference(files[fileIndex], refactorDetails);
            }
        });
    }

    /**
     * Updates namespace references in a single file.
     * @param uri The URI of the file to update.
     * @param refactorDetails Details about what needs to be refactored.
     */
    private async updateReference(uri: vscode.Uri, refactorDetails: NamespaceRefactorDetailsType): Promise<void> {
        try {
            const fileContent = await this.getFileContent(uri);
            const namespaceDeclarationRegExp = this.getNamespaceDeclarationRegExp();
            const namespaceDeclarationMatch = fileContent.match(namespaceDeclarationRegExp);
            const fileNamespace = namespaceDeclarationMatch?.[1];
            if (!fileNamespace) {
                return;
            }

            let fileContentUpdated = fileContent;
            fileContentUpdated = this.refactorFullyQualified(fileContentUpdated, fileNamespace, refactorDetails);
            fileContentUpdated = this.refactorUseStatement(fileContentUpdated, fileNamespace, refactorDetails);
            fileContentUpdated = this.refactorIdentifier(fileContentUpdated, fileNamespace, refactorDetails);
            if (fileContentUpdated === fileContent) {
                return;
            }

            await this.updateFileContent(uri, fileContentUpdated);
        } catch (error) {
            const errorDetails = error instanceof Error ? error.message : String(error);
            const errorMessage = vscode.l10n.t("Error updating references in file {0}: {1}", uri.fsPath, errorDetails);
            vscode.window.showErrorMessage(errorMessage);
        }
    }

    /**
     * Updates fully qualified class name references in file content.
     * Handles cases where the namespace or identifier has changed.
     * @param content The content of the file to refactor.
     * @param fileNamespace The current namespace of the file.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The updated content with refactored fully qualified references.
     */
    private refactorFullyQualified(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): string {
        const oldFullyQualifiedNamespace = `\\${refactorDetails.oldNamespace}\\${refactorDetails.oldIdentifier}`;
        const newFullyQualifiedNamespace = `\\${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier}`;

        if (fileNamespace === refactorDetails.newNamespace) {
            return this.replaceFullyQualified(content, oldFullyQualifiedNamespace, refactorDetails.newIdentifier);
        }

        return this.replaceFullyQualified(content, oldFullyQualifiedNamespace, newFullyQualifiedNamespace);
    }

    /**
     * Replaces fully qualified namespace references in the content.
     * @param content The content to modify.
     * @param oldFullyQualifiedNamespace The old fully qualified namespace.
     * @param newFullyQualifiedNamespace The new fully qualified namespace.
     * @returns The updated content with replaced references.
     */
    private replaceFullyQualified(
        content: string,
        oldFullyQualifiedNamespace: string,
        newFullyQualifiedNamespace: string
    ): string {
        const fqcnRegExp = this.getFullyQualifiedNamespaceRegExp(oldFullyQualifiedNamespace);
        return content.replace(fqcnRegExp, newFullyQualifiedNamespace);
    }

    /**
     * Updates use statements based on the namespace changes.
     * Handles adding, removing, or replacing use statements.
     * @param content The content of the file to refactor.
     * @param fileNamespace The current namespace of the file.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The updated content with refactored use statements.
     */
    private refactorUseStatement(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): string {
        if (fileNamespace === refactorDetails.oldNamespace) {
            return this.addReferenceUseStatement(content, refactorDetails);
        }

        if (fileNamespace === refactorDetails.newNamespace) {
            return this.removeReferenceUseStatement(content, refactorDetails);
        }

        return this.replaceReferenceUseStatement(content, refactorDetails);
    }

    /**
     * Replaces a use statement with the updated namespace and identifier.
     * @param content The content of the file to refactor.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The updated content with replaced use statements.
     */
    private replaceReferenceUseStatement(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const oldFullQualifiedNamespace = `${refactorDetails.oldNamespace}\\${refactorDetails.oldIdentifier}`;
        const newFullQualifiedNamespace = `${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier}`;
        const useRegExp = this.getUseStatementRegExp(oldFullQualifiedNamespace);
        return content.replace(useRegExp, `use ${newFullQualifiedNamespace};`);
    }

    /**
     * Adds a new use statement for the updated namespace and identifier.
     * @param content The content of the file to refactor.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The updated content with the added use statement.
     */
    private addReferenceUseStatement(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const hasIdentifierRegExp = this.getIdentifierRegExp(refactorDetails.newIdentifier);
        if (!hasIdentifierRegExp.test(content)) {
            return content;
        }
        return this.addUseStatement(content, refactorDetails.newNamespace, refactorDetails.newIdentifier);
    }

    /**
     * Removes an outdated use statement for the old namespace and identifier.
     * @param content The content of the file to refactor.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The updated content with the removed use statement.
     */
    private removeReferenceUseStatement(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        return this.removeUseStatement(content, refactorDetails.oldNamespace, refactorDetails.oldIdentifier);
    }

    /**
     * Finds all PHP files in the workspace that might need reference updates.
     * Excludes the file being refactored and any directories configured to be excluded.
     * @param fileUri The URI of the file being refactored.
     * @returns Array of URIs for PHP files that might need updates.
     */
    private async findFilesToRefactor(fileUri: vscode.Uri): Promise<vscode.Uri[]> {
        const config = vscode.workspace.getConfiguration("phpFileCreator");
        const excludedFolders = config.get<string[]>("refactorNamespacesExcludeDirectories", []);

        const relativeFilePath = vscode.workspace.asRelativePath(fileUri.fsPath);
        const excludedFile = getPathNormalized(relativeFilePath);

        const excludePattern = `{${[...excludedFolders, excludedFile].join(",")}}`;
        return vscode.workspace.findFiles("**/*.php", excludePattern);
    }
}
