import * as vscode from "vscode";
import { getPathNormalized } from "../../../utils/filesystem/getPathNormalized";
import { NamespaceRefactorerAbstract } from "../abstract/NamespaceRefactorerAbstract";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";

/**
 * Handles refactoring of namespace references across multiple PHP files when a file
 * with a namespace is moved or renamed.
 */
export class NamespaceReferencesRefactorer extends NamespaceRefactorerAbstract {
    /**
     * Processes namespace reference updates across the workspace.
     * @param refactorDetails Contains information about the old and new namespace/identifier values
     * @returns Promise resolving to true if refactoring was performed, false otherwise
     */
    public async refactor(refactorDetails: NamespaceRefactorDetailsType): Promise<boolean> {
        if (!refactorDetails.hasNamespaces || !refactorDetails.hasChanged) {
            return false;
        }

        await this.startUpdateReferences(refactorDetails);
        return true;
    }

    /**
     * Displays a progress notification while updating references in all relevant files.
     * @param refactorDetails Contains information about the namespaces and identifiers to be updated
     */
    private async startUpdateReferences(refactorDetails: NamespaceRefactorDetailsType): Promise<void> {
        const options: vscode.ProgressOptions = {
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t(
                'Updating references from "{0}" to "{1}"',
                refactorDetails.old.namespace,
                refactorDetails.new.namespace
            ),
        };

        await vscode.window.withProgress(options, async (progress) => {
            await this.progressUpdateReferences(progress, refactorDetails);
        });
    }

    /**
     * Performs the actual reference updates with progress reporting.
     * Processes all found files in parallel and updates the progress indicator.
     * @param progress The VS Code Progress object for displaying progress
     * @param refactorDetails Contains information about the namespaces and identifiers to be updated
     */
    private async progressUpdateReferences(
        progress: vscode.Progress<{
            message?: string;
            increment?: number;
        }>,
        refactorDetails: NamespaceRefactorDetailsType
    ): Promise<void> {
        const files = await this.findFilesToRefactor(refactorDetails.new.uri);
        const progressIncrement = 100 / files.length;
        const processPromises: Promise<void>[] = [];

        let completed = 0;
        for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
            const fileUri = files[fileIndex];
            const promise = this.updateReference(fileUri, refactorDetails).then(() => {
                completed++;
                progress.report({
                    increment: progressIncrement,
                    message: vscode.l10n.t("Processing file {0} of {1}", completed, files.length),
                });
            });
            processPromises.push(promise);
        }

        await Promise.all(processPromises);
    }

    /**
     * Updates namespace references in a single file.
     * @param uri The URI of the file to update
     * @param refactorDetails Contains information about the old and new namespace/identifier values
     */
    private async updateReference(uri: vscode.Uri, refactorDetails: NamespaceRefactorDetailsType): Promise<void> {
        try {
            const fileContent = await this.getFileContent(uri);
            const namespaceDeclarationRegExp = this.namespaceRegExpProvider.getNamespaceDeclarationRegExp();
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

            await this.setFileContent(uri, fileContentUpdated);
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
        const oldFullyQualifiedNamespace = `\\${refactorDetails.old.namespace}\\${refactorDetails.old.identifier}`;
        const newFullyQualifiedNamespace = `\\${refactorDetails.new.namespace}\\${refactorDetails.new.identifier}`;
        const fqcnRegExp = this.namespaceRegExpProvider.getFullyQualifiedNamespaceRegExp(oldFullyQualifiedNamespace);
        
        const isSameNamespace = fileNamespace === refactorDetails.new.namespace;
        const replaceWith = isSameNamespace ? refactorDetails.new.identifier : newFullyQualifiedNamespace;
        return content.replace(fqcnRegExp, replaceWith);
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
        if (fileNamespace === refactorDetails.old.namespace && refactorDetails.hasNamespaceChanged) {
            content = this.addReferenceUseStatement(content, refactorDetails);
        } else if (fileNamespace === refactorDetails.new.namespace) {
            content = this.removeReferenceUseStatement(content, refactorDetails);
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
        const oldFullQualifiedNamespace = `${refactorDetails.old.namespace}\\${refactorDetails.old.identifier}`;
        const newFullQualifiedNamespace = `${refactorDetails.new.namespace}\\${refactorDetails.new.identifier}`;
        const useRegExp = this.namespaceRegExpProvider.getUseStatementRegExp(oldFullQualifiedNamespace, {
            includeAlias: true,
        });

        return content.replace(useRegExp, (match, namespace, alias) => {
            return `use ${newFullQualifiedNamespace}${alias ? ` as ${alias}` : ""};`;
        });
    }

    /**
     * Adds a new use statement for the updated namespace and identifier.
     * @param content The content of the file to refactor.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The updated content with the added use statement.
     */
    private addReferenceUseStatement(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        const hasIdentifierRegExp = this.namespaceRegExpProvider.getIdentifierRegExp(refactorDetails.old.identifier);
        if (!hasIdentifierRegExp.test(content)) {
            return content;
        }
        return this.addUseStatement(content, refactorDetails.new.namespace, refactorDetails.new.identifier);
    }

    /**
     * Removes an outdated use statement for the old namespace and identifier.
     * @param content The content of the file to refactor.
     * @param refactorDetails Details about what needs to be refactored.
     * @returns The updated content with the removed use statement.
     */
    private removeReferenceUseStatement(content: string, refactorDetails: NamespaceRefactorDetailsType): string {
        return this.removeUseStatement(content, refactorDetails.old.namespace, refactorDetails.old.identifier);
    }

    /**
     * Finds all PHP files in the workspace that might need reference updates.
     * Excludes the file being refactored and any directories configured to be excluded.
     * @param fileUri The URI of the file being refactored.
     * @returns Array of URIs for PHP files that might need updates.
     */
    private async findFilesToRefactor(fileUri: vscode.Uri): Promise<vscode.Uri[]> {
        const config = vscode.workspace.getConfiguration("phpSmartFiles");
        const excludedFolders = config.get<string[]>("refactorNamespacesExcludeDirectories", []);

        const relativeFilePath = vscode.workspace.asRelativePath(fileUri.fsPath);
        const excludedFile = getPathNormalized(relativeFilePath);

        const excludePattern = `{${[...excludedFolders, excludedFile].join(",")}}`;
        return vscode.workspace.findFiles("**/*.php", excludePattern);
    }
}
