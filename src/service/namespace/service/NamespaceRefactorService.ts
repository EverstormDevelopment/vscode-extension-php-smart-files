import * as vscode from "vscode";
import { NamespaceDirectoryRefactorer } from "../component/NamespaceDirectoryRefactorer";
import { NamespaceFileRefactorer } from "../component/NamespaceFileRefactorer";
import { NamespaceRefactorDetailsProvider } from "../provider/NamespaceRefactorDetailsProvider";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";

/**
 * Service class that coordinates namespace refactoring for PHP files.
 * Orchestrates both file content updates and references across the workspace.
 */
export class NamespaceRefactorService {
    /**
     * Creates a new instance of the NamespaceRefactorService.
     * @param namespaceRefactorDetailsProvider Provider that generates refactor details from URIs
     * @param namespaceFileRefactorer Component that handles refactoring of individual files
     * @param namespaceDirectoryRefactorer Component that handles refactoring of directories
     */
    constructor(
        private readonly namespaceRefactorDetailsProvider: NamespaceRefactorDetailsProvider,
        private readonly namespaceFileRefactorer: NamespaceFileRefactorer,
        private readonly namespaceDirectoryRefactorer: NamespaceDirectoryRefactorer
    ) {}

    /**
     * Refactors a PHP file's namespace and references when it's moved or renamed.
     * @param oldUri Original URI of the PHP file before moving/renaming
     * @param newUri New URI of the PHP file after moving/renaming
     * @returns A Promise that resolves when refactoring is complete
     */
    public async refactorFile(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const refactorDetails = await this.namespaceRefactorDetailsProvider.get(oldUri, newUri);
        if (!this.isRefactorable(refactorDetails)) {
            return;
        }

        await this.namespaceFileRefactorer.refactor(refactorDetails);
    }

    /**
     * Refactors namespaces for all PHP files within a directory when it's moved or renamed.
     * @param oldUri Original URI of the directory before moving/renaming
     * @param newUri New URI of the directory after moving/renaming
     * @returns A Promise that resolves when refactoring is complete
     */
    public async refactorDirectory(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const directoryRefactorDetails = await this.namespaceRefactorDetailsProvider.get(oldUri, newUri);
        if (!this.isRefactorable(directoryRefactorDetails)) {
            return;
        }

        await this.namespaceDirectoryRefactorer.refactor(directoryRefactorDetails);
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
