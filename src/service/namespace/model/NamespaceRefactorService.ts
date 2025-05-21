import * as vscode from "vscode";
import { getFilesInUriDirectory } from "../../../utils/filesystem/getFilesInUriDirectory";
import { NamespaceRefactorDetailsProvider } from "../provider/NamespaceRefactorDetailsProvider";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";
import { NamespaceFileRefactorer } from "./NamespaceFileRefactorer";
import { NamespaceReferencesRefactorer } from "./NamespaceReferencesRefactorer";

/**
 * Service class that coordinates namespace refactoring for PHP files.
 * Orchestrates both file content updates and references across the workspace.
 */
export class NamespaceRefactorService {
    /**
     * Initializes the namespace refactoring service with its required dependencies.
     * @param namespaceRefactorDetailsProvider Provider for refactoring details based on file changes
     * @param namespaceFileRefactorer Handles refactoring within the moved/renamed file
     * @param namespaceReferencesRefactorer Handles refactoring references in other files
     */
    constructor(
        private readonly namespaceRefactorDetailsProvider: NamespaceRefactorDetailsProvider,
        private readonly namespaceFileRefactorer: NamespaceFileRefactorer,
        private readonly namespaceReferencesRefactorer: NamespaceReferencesRefactorer
    ) {}

    /**
     * Performs a complete refactoring operation by updating both the file
     * and its references across the workspace.
     * @param oldUri The original URI of the file before moving/renaming
     * @param newUri The new URI of the file after moving/renaming
     * @returns A promise that resolves when the refactoring operations are complete
     */
    public async refactorFileAndReferences(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const refactorDetrails = await this.namespaceRefactorDetailsProvider.get(oldUri, newUri);
        if (!this.isRefactorable(refactorDetrails)) {
            return;
        }

        const updatedFile = await this.refactorFile(refactorDetrails);
        if (!updatedFile) {
            return;
        }

        await this.refactorReferences(refactorDetrails);
    }

    /**
     * Recursively refactors all PHP files in a directory that has been moved/renamed.
     * For each file, updates both its namespace and references to it across the workspace.
     * @param oldUri The original URI of the directory before moving/renaming
     * @param newUri The new URI of the directory after moving/renaming
     * @returns A promise that resolves when all refactoring operations are complete
     */
    public async refactorDirectoryAndReferences(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const directoryRefactorDetails = await this.namespaceRefactorDetailsProvider.get(oldUri, newUri);
        if (!this.isRefactorable(directoryRefactorDetails)) {
            return;
        }

        const phpFiles = await getFilesInUriDirectory(newUri, "**/*.php");
        for (const newFileUri of phpFiles) {
            const oldPath = newFileUri.path.replace(newUri.path, oldUri.path);
            const oldFileUri = newFileUri.with({ path: oldPath });

            await this.refactorFileAndReferences(oldFileUri, newFileUri);
        }
    }

    /**
     * Refactors the content of the moved/renamed file.
     * @param refactorDetails Details about the refactoring operation
     * @returns A promise that resolves to true if changes were made, false otherwise
     */
    private async refactorFile(refactorDetrails: NamespaceRefactorDetailsType): Promise<boolean> {
        return this.namespaceFileRefactorer.refactor(refactorDetrails);
    }

    /**
     * Updates references to the refactored file across the workspace.
     * @param refactorDetails Details about the refactoring operation
     * @returns A promise that resolves to true if changes were made, false otherwise
     */
    private async refactorReferences(refactorDetrails: NamespaceRefactorDetailsType): Promise<boolean> {
        return this.namespaceReferencesRefactorer.refactor(refactorDetrails);
    }

    /**
     * Checks if the PHP file can be safely refactored based on namespace and identifier validity.
     * Shows appropriate warning messages to the user when validation fails.
     * @param refactorDetails Details about the namespace refactoring operation
     * @returns true if refactoring can proceed, false otherwise
     */
    private isRefactorable(refactorDetails: NamespaceRefactorDetailsType): boolean {
        if (!refactorDetails.new.isNamespaceValid) {
            const message = vscode.l10n.t(
                "The detected namespace '{0}' is not a valid PHP namespace. The refactoring process has been canceled.",
                refactorDetails.new.namespaceInvalid || refactorDetails.new.namespace || "undefined"
            );
            vscode.window.showWarningMessage(message);
            return false;
        }

        if (!refactorDetails.new.isIdentifierValid) {
            const message = vscode.l10n.t(
                "The provided name '{0}' is not a valid PHP identifier. The refactoring process has been canceled.",
                refactorDetails.new.identifierInvalid || refactorDetails.new.identifier || "undefined"
            );
            vscode.window.showWarningMessage(message);
            return false;
        }

        return true;
    }
}
