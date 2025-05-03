import * as vscode from "vscode";

/**
 * Interface for specific PHP snippet type factory implementations.
 */
export interface PhpSnippetTypeFactoryInterface {
    /**
     * Creates a specific type of PHP snippet.
     * @param identifier Optional name/identifier for the PHP element
     * @param namespace Optional namespace for the PHP element
     * @returns A VS Code snippet string representing the PHP code
     */
    create(identifier?: string, namespace?: string): vscode.SnippetString;
}
