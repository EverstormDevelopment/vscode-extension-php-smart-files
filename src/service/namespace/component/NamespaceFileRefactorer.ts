import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";
import { NamespaceReferencesRefactorer } from "./NamespaceReferencesRefactorer";
import { NamespaceSourceRefactorer } from "./NamespaceSourceRefactorer";

/**
 * Orchestrates the complete refactoring process for a PHP file's namespace.
 * This service coordinates both updating the file itself (namespace and class name)
 * and updating all references to this file throughout the workspace.
 */
export class NamespaceFileRefactorer {
    /**
     * Creates a new instance of NamespaceFileRefactorer.
     * @param namespaceSourceRefactorer Service that updates the namespace and class name in the source file
     * @param namespaceReferencesRefactorer Service that updates references to the class throughout the workspace
     */
    constructor(
        private readonly namespaceSourceRefactorer: NamespaceSourceRefactorer,
        private readonly namespaceReferencesRefactorer: NamespaceReferencesRefactorer
    ) {}

    /**
     * Performs the complete refactoring process for a file.
     * First updates the file itself, and if successful, updates all references to it.
     * If no changes were made to the file, the reference update is skipped.
     * @param refactorDetails Details about the old and new file locations and identifiers
     * @returns A Promise that resolves when the refactoring is complete
     */
    public async refactor(refactorDetails: NamespaceRefactorDetailsType): Promise<void> {
        const isFileUpdated = await this.refactorFile(refactorDetails);
        if (!isFileUpdated) {
            return;
        }

        await this.refactorReferences(refactorDetails);
    }

    /**
     * Refactors the content of the moved/renamed file.
     * @param refactorDetails Details about the refactoring operation
     * @returns A promise that resolves to true if changes were made, false otherwise
     */
    private async refactorFile(refactorDetails: NamespaceRefactorDetailsType): Promise<boolean> {
        return this.namespaceSourceRefactorer.refactor(refactorDetails);
    }

    /**
     * Updates references to the refactored file across the workspace.
     * @param refactorDetails Details about the refactoring operation
     * @returns A promise that resolves to true if changes were made, false otherwise
     */
    private async refactorReferences(refactorDetails: NamespaceRefactorDetailsType): Promise<boolean> {
        return this.namespaceReferencesRefactorer.refactor(refactorDetails);
    }
}
