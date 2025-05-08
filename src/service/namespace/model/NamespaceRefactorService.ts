import * as vscode from "vscode";
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
        private readonly namespaceFileRefactorer: NamespaceFileRefactorer,
        private readonly namespaceReferencesRefactorer: NamespaceReferencesRefactorer,
    ) {}

    /**
     * Performs a complete refactoring operation by updating both the file
     * and its references across the workspace.
     * @param oldUri The original URI of the file before moving/renaming
     * @param newUri The new URI of the file after moving/renaming
     */
    public async refactorFileAndReferences(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const updatedFile = await this.refatorFile(oldUri, newUri);
        if (!updatedFile) {
            return;
        }

        await this.refactorReferences(oldUri, newUri);
    }

    /**
     * Updates namespace declarations and class definitions in the moved/renamed file.
     * @param oldUri The original URI of the file before moving/renaming
     * @param newUri The new URI of the file after moving/renaming
     * @returns Promise resolving to true if refactoring was performed, false otherwise
     */
    public async refatorFile(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<boolean> {
        return this.namespaceFileRefactorer.refactor(oldUri, newUri);
    }

    /**
     * Updates references to the file's namespace and class in other PHP files.
     * @param oldUri The original URI of the file before moving/renaming
     * @param newUri The new URI of the file after moving/renaming
     * @returns Promise resolving to true if refactoring was performed, false otherwise
     */
    public async refactorReferences(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<boolean> {
        return this.namespaceReferencesRefactorer.refactor(oldUri, newUri);
    }
}
