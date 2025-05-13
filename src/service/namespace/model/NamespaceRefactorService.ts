import * as vscode from "vscode";
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
     */
    public async refactorFileAndReferences(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const refactorDetrails = await this.namespaceRefactorDetailsProvider.get(oldUri, newUri);
        const updatedFile = await this.refactorFile(refactorDetrails);
        if (!updatedFile) {
            return;
        }

        await this.refactorReferences(refactorDetrails);
    }

    private async refactorFile(refactorDetrails: NamespaceRefactorDetailsType): Promise<boolean> {
        return this.namespaceFileRefactorer.refactor(refactorDetrails);
    }

    private async refactorReferences(refactorDetrails: NamespaceRefactorDetailsType): Promise<boolean> {
        return this.namespaceReferencesRefactorer.refactor(refactorDetrails);
    }
}
