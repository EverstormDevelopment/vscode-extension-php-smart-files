import * as vscode from 'vscode';

/**
 * Interface defining the lifecycle methods for the extension.
 * Provides a contract for extension activation and deactivation.
 */
export interface ExtensionInterface
{
    /**
     * Activates the extension with the given context.
     * @param context The VS Code extension context
     * @returns The extension instance for method chaining
     */
    activate(context: vscode.ExtensionContext): this;
    
    /**
     * Deactivates the extension and performs cleanup tasks.
     * @returns The extension instance for method chaining
     */
    deactivate(): this;
}