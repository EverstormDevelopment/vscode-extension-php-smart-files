// The module 'vscode' contains the VS Code extensibility API
import * as vscode from "vscode";
import { NewEmptyPhpClassCommand } from "./command/explorer/NewEmptyPhpClassCommand";
import { NewEmptyPhpFileCommand } from "./command/explorer/NewEmptyPhpFileCommand";
import { ExplorerCommandInterface } from "./command/interface/ExplorerCommandInterface";
import { ContainerFactory } from "./container/ContainerFactory";
import { ContainerInterface } from "./container/interface/ContainerInterface";
import { ConstructorType } from "./container/type/ConstructorType";
import { ExtensionId } from "./extension/ExtensionId";


/**
 * Global container instance to be available throughout the extension lifecycle
 */
let container: ContainerInterface | undefined;

/**
 * This method is called when the extension is activated
 * @param context The extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext) {
    console.log(`Congratulations, your extension "${ExtensionId}" is now active!`);

    container = ContainerFactory.createDefaultContainer();
    const commands: Record<string, ConstructorType<ExplorerCommandInterface>> = {
        newEmptyPhpFile: NewEmptyPhpFileCommand,
        newEmptyPhpClass: NewEmptyPhpClassCommand,
    };

    for (const [name, constructor] of Object.entries(commands)) {
        registerCommand(name, constructor, context);
    }
}

/**
 * Registers a VS Code command with the specified name and command constructor
 * @param name The command name without prefix
 * @param constructor The constructor of the command implementation
 * @param context The extension context
 */
function registerCommand(
    name: string,
    constructor: ConstructorType<ExplorerCommandInterface>,
    context: vscode.ExtensionContext
): void {
    const commandId = `${ExtensionId}.${name}`;
    const command = vscode.commands.registerCommand(commandId, createCommandCallback(constructor, name));
    context.subscriptions.push(command);
}

/**
 * Creates a command callback function for the given command constructor
 * @param constructor The constructor of the command implementation
 * @param commandName The name of the command for error reporting
 * @returns A callback function that executes the command
 */
function createCommandCallback(
    constructor: ConstructorType<ExplorerCommandInterface>,
    commandName: string
): (uri?: vscode.Uri) => Promise<void> {
    return async (uri?: vscode.Uri) => {
        if (!container) {
            vscode.window.showErrorMessage(`${ExtensionId}: Container not initialized`);
            return;
        }

        try {
            await container.get(constructor).execute(uri);
        } catch (error) {
            vscode.window.showErrorMessage(
                `${ExtensionId}: Error executing ${commandName}: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    };
}

/**
 * This method is called when the extension is deactivated
 * Performs cleanup tasks to free resources
 */
export function deactivate() {
    container = undefined;
    console.log(`Extension "${ExtensionId}" has been deactivated.`);
}
