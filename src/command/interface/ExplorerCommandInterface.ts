import * as vscode from 'vscode';

/**
 * Interface for commands that can be executed in the Explorer context
 */
export interface ExplorerCommandInterface {
    /**
     * Execute the command
     * @param uri The URI from the command execution context
     */
    execute(uri?: vscode.Uri): Promise<void>
}