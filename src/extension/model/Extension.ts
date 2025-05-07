import * as vscode from "vscode";
import { ContainerInterface } from "../../container/interface/ContainerInterface";
import { FileMovedObserver } from "../../service/refactor/observer/FileMovedObserver";
import { FileTypeEnum } from "../../utils/enum/FileTypeEnum";
import { ExtensionInterface } from "../interface/ExtensionInterface";
import { FileGenerationCommandRegistry } from "../registry/FileGenerationCommandRegistry";
import { FileGenerationCommand } from "./../command/FileGenerationCommand";
import { ContainerFactory } from "../../container/build/ContainerFactory";

/**
 * The main extension class that handles the extension lifecycle.
 */
export class Extension implements ExtensionInterface {
    /**
     * The extension ID from the manifest
     */
    private id: string | undefined;

    /**
     * The extension name from the manifest
     */
    private name: string | undefined;

    /**
     * The extension version from the manifest
     */
    private version: string | undefined;

    /**
     * The dependency injection container
     */
    private container: ContainerInterface;

    /**
     * Creates a new Extension instance with default container
     */
    constructor() {
        this.container = ContainerFactory.createDefaultContainer();
    }

    /**
     * Activates the extension, initializing all dependencies and registering commands
     * @param context The VS Code extension context
     * @returns This extension instance for chaining
     */
    public activate(context: vscode.ExtensionContext): this {
        this.initialize(context);
        this.addFileCreationCommands(context);

        this.container.get(FileMovedObserver).start(context);

        return this;
    }

    /**
     * Initializes extension metadata from context
     * @param context The VS Code extension context
     */
    private initialize(context: vscode.ExtensionContext): void {
        this.id = context.extension.id;
        this.name = context.extension.packageJSON.name;
        this.version = context.extension.packageJSON.version;
    }

    /**
     * Registers all file creation commands with VS Code
     * @param context The VS Code extension context
     */
    private addFileCreationCommands(context: vscode.ExtensionContext): void {
        const commandRegistry = FileGenerationCommandRegistry;
        for (const [commandName, fileType] of Object.entries(commandRegistry)) {
            this.addFileCreationCommand(context, commandName, fileType);
        }
    }

    /**
     * Registers a single file creation command with VS Code
     * @param context The VS Code extension context
     * @param commandName The command name suffix
     * @param fileType The PHP file type to create when the command is executed
     */
    private addFileCreationCommand(
        context: vscode.ExtensionContext,
        commandName: string,
        fileType: FileTypeEnum
    ): void {
        const commandId = `${this.name}.${commandName}`;
        const vscodeCommand = vscode.commands.registerCommand(commandId, async (uri?: vscode.Uri) => {
            const fileGenerationCommand = this.container.get(FileGenerationCommand);
            await fileGenerationCommand.execute(fileType, uri);
        });
        context.subscriptions.push(vscodeCommand);
    }

    /**
     * Deactivates the extension and cleans up resources
     * @returns This extension instance for chaining
     */
    public deactivate(): this {
        return this;
    }
}
