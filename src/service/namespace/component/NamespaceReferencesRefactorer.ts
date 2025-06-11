import * as vscode from "vscode";
import { getPathNormalized } from "../../../utils/filesystem/getPathNormalized";
import { getUseTypeByKind } from "../../../utils/php/functions/getUseTypeByKind";
import { escapeRegExp } from "../../../utils/regexp/escapeRegExp";
import { NamespaceRefactorerAbstract } from "../abstract/NamespaceRefactorerAbstract";
import { IdentifierType } from "../type/IdentifierType";
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
            fileContentUpdated = this.refactorNamespace(fileContentUpdated, fileNamespace, refactorDetails);
            fileContentUpdated = this.refactorFileIdentifier(fileContentUpdated, fileNamespace, refactorDetails);
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
     * Updates namespace references in all identified PHP files.
     * @param refactorDetails Contains information about the old and new namespace/identifier values
     */
    private refactorNamespace(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): string {
        const oldNamespace = refactorDetails.old.namespace;
        const newNamespace = refactorDetails.new.namespace;
        for (const identifier of refactorDetails.identifiers) {
            content = this.refactorFullyQualified(content, fileNamespace, oldNamespace, newNamespace, identifier);
            content = this.refactorPartialQualified(content, fileNamespace, oldNamespace, newNamespace, identifier);
            content = this.refactorUseStatement(content, fileNamespace, oldNamespace, newNamespace, identifier);
        }
        return content;
    }

    /**
     * Updates references to the file identifier (class/interface/trait name) if it has changed.
     * @param content The file content to process
     * @param fileNamespace The namespace of the file being processed
     * @param refactorDetails Contains information about the old and new namespace/identifier values
     * @returns Updated file content with refactored identifiers
     */
    private refactorFileIdentifier(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): string {
        if (!refactorDetails.hasFileIdentifierChanged) {
            return content;
        }
        return this.refactorIdentifier(content, fileNamespace, refactorDetails);
    }

    /**
     * Updates fully qualified namespace references in the file content.
     * Handles transformation from \Old\Namespace\Class to \New\Namespace\Class
     * or to just the class name if the new namespace matches the file's namespace.
     * @param content The file content to process
     * @param fileNamespace The namespace of the file being processed
     * @param oldNamespace The original namespace that was changed
     * @param newNamespace The new namespace value
     * @param identifier The identifier (class/interface/trait/etc) to update
     * @returns Updated file content with refactored fully qualified references
     */
    private refactorFullyQualified(
        content: string,
        fileNamespace: string,
        oldNamespace: string,
        newNamespace: string,
        identifier: IdentifierType
    ): string {
        const oldFullyQualifiedNamespace = `\\${oldNamespace}\\${identifier.name}`;
        const newFullyQualifiedNamespace = `\\${newNamespace}\\${identifier.name}`;
        const fqnRegExp = this.namespaceRegExpProvider.getFullyQualifiedNamespaceRegExp(oldFullyQualifiedNamespace);

        const isSameNamespace = fileNamespace === newNamespace;
        const replaceWith = isSameNamespace ? identifier.name : newFullyQualifiedNamespace;
        return content.replace(fqnRegExp, replaceWith);
    }

    /**
     * Updates partially qualified namespace references in the file content.
     * Handles complex transformation logic for references like SubNamespace\Class
     * based on the relationship between the file's namespace and the new namespace.
     * @param content The file content to process
     * @param fileNamespace The namespace of the file being processed
     * @param oldNamespace The original namespace that was changed
     * @param newNamespace The new namespace value
     * @param identifier The identifier (class/interface/trait/etc) to update
     * @returns Updated file content with refactored partially qualified references
     */
    private refactorPartialQualified(
        content: string,
        fileNamespace: string,
        oldNamespace: string,
        newNamespace: string,
        identifier: IdentifierType
    ): string {
        const oldFullyQualifiedNamespace = `\\${oldNamespace}\\${identifier.name}`;
        const newFullyQualifiedNamespace = `\\${newNamespace}\\${identifier.name}`;
        const pqnRegExp = this.namespaceRegExpProvider.getPartiallyQualifiedReferenceRegExp();

        return content.replace(pqnRegExp, (match: string, ...groups: (string | undefined)[]) => {
            const partiallyQualifiedReference = groups.find((group) => group !== undefined);
            if (!partiallyQualifiedReference) {
                return match;
            }

            const fullyQualifiedReference = `\\${fileNamespace}\\${partiallyQualifiedReference}`;
            const isCorrectReference = fullyQualifiedReference === oldFullyQualifiedNamespace;
            if (!isCorrectReference) {
                return match;
            }

            const isSameNamespace = fileNamespace === newNamespace;
            if (isSameNamespace) {
                return match.replace(partiallyQualifiedReference, identifier.name);
            }

            const escapedFileNamespace = escapeRegExp(`${fileNamespace}\\`);
            const subNamespaceRegExp = new RegExp(`^${escapedFileNamespace}`, "u");
            const isSubNamespace = !!newNamespace.match(subNamespaceRegExp);
            if (!isSubNamespace) {
                return match.replace(partiallyQualifiedReference, newFullyQualifiedNamespace);
            }

            const refactoredNamespace = newNamespace.replace(subNamespaceRegExp, "");
            const refactoredReference = `${refactoredNamespace}\\${identifier.name}`;
            return match.replace(partiallyQualifiedReference, refactoredReference);
        });
    }

    /**
     * Updates or manages use statements for the refactored namespace.
     * Adds, removes, or replaces use statements based on the relationship
     * between the file's namespace and the old/new namespaces.
     * @param content The file content to process
     * @param fileNamespace The namespace of the file being processed
     * @param oldNamespace The original namespace that was changed
     * @param newNamespace The new namespace value
     * @param identifier The identifier (class/interface/trait/etc) to update
     * @returns Updated file content with refactored use statements
     */
    private refactorUseStatement(
        content: string,
        fileNamespace: string,
        oldNamespace: string,
        newNamespace: string,
        identifier: IdentifierType
    ): string {
        const hasNamespaceChange = oldNamespace !== newNamespace;
        if (fileNamespace === oldNamespace && hasNamespaceChange) {
            content = this.addReferenceUseStatement(content, newNamespace, identifier);
        } else if (fileNamespace === newNamespace) {
            content = this.removeReferenceUseStatement(content, oldNamespace, identifier);
        }

        return this.replaceReferenceUseStatement(content, oldNamespace, newNamespace, identifier);
    }

    /**
     * Adds a use statement for the identifier if it's referenced in the content
     * but doesn't already have an appropriate use statement.
     * @param content The file content to process
     * @param newNamespace The new namespace value to add in the use statement
     * @param identifier The identifier (class/interface/trait/etc) to add a use statement for
     * @returns Updated file content with added use statement (if needed)
     */
    private addReferenceUseStatement(content: string, newNamespace: string, identifier: IdentifierType): string {
        const hasIdentifierRegExp = this.namespaceRegExpProvider.getIdentifierRegExp(identifier.name);
        if (!hasIdentifierRegExp.test(content)) {
            return content;
        }
        return this.addUseStatement(content, newNamespace, identifier);
    }

    /**
     * Removes a use statement for the identifier if it exists in the content.
     * @param content The file content to process
     * @param oldNamespace The namespace to remove from the use statement
     * @param identifier The identifier (class/interface/trait/etc) to remove a use statement for
     * @returns Updated file content with removed use statement
     */
    private removeReferenceUseStatement(content: string, oldNamespace: string, identifier: IdentifierType): string {
        return this.removeUseStatement(content, oldNamespace, identifier);
    }

    /**
     * Replaces existing use statements that reference the old namespace
     * with updated statements that reference the new namespace.
     * Preserves any aliases that might be present.
     * @param content The file content to process
     * @param oldNamespace The original namespace that was changed
     * @param newNamespace The new namespace value
     * @param identifier The identifier (class/interface/trait/etc) to update
     * @returns Updated file content with replaced use statements
     */
    private replaceReferenceUseStatement(
        content: string,
        oldNamespace: string,
        newNamespace: string,
        identifier: IdentifierType
    ): string {
        const oldFullQualifiedNamespace = `${oldNamespace}\\${identifier.name}`;
        const newFullQualifiedNamespace = `${newNamespace}\\${identifier.name}`;
        const useRegExp = this.namespaceRegExpProvider.getUseStatementRegExp(oldFullQualifiedNamespace, {
            matchKind: identifier.kind,
            includeAlias: true,
        });

        const useType = getUseTypeByKind(identifier.kind);
        return content.replace(useRegExp, (match, namespace, alias) => {
            return `use ${useType}${newFullQualifiedNamespace}${alias ? ` as ${alias}` : ""};`;
        });
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
