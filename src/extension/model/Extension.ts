import * as vscode from "vscode";
import { ContainerFactory } from "../../container/build/ContainerFactory";
import { ContainerInterface } from "../../container/interface/ContainerInterface";
import { ConstructorType } from "../../container/type/ConstructorType";
import { FilesystemObserverInterface } from "../../service/filesystem/observer/interface/FilesystemObserverInterface";
import { FileTypeEnum } from "../../utils/php/enum/FileTypeEnum";
import { ExtensionInterface } from "../interface/ExtensionInterface";
import { FileGenerationCommandRegistry } from "../registry/FileGenerationCommandRegistry";
import { ObserverRegistry } from "../registry/ObserverRegistry";
import { FileGenerationCommand } from "./../command/FileGenerationCommand";

/**
 * The main extension class that handles the extension lifecycle.
 */
export class Extension implements ExtensionInterface {
    /**
     * The extension name from the manifest
     */
    private name: string | undefined;

    /**
     * The dependency injection container
     */
    private container: ContainerInterface;

    /**
     * Tracks if observers have been registered
     */
    private hasObserversRegistered: boolean | undefined;

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
        this.addLazyObserverRegistration(context);
        return this;
    }

    /**
     * Initializes extension metadata from context
     * @param context The VS Code extension context
     */
    private initialize(context: vscode.ExtensionContext): void {
        // this.id = context.extension.id;
        // this.version = context.extension.packageJSON.version;
        this.name = context.extension.packageJSON.name;
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
     * Sets up a lazy registration mechanism for file system observers
     * Observers are only registered if PHP files are present in the workspace
     * If no PHP files exist initially, a watcher is set up to detect when PHP files are created
     * @param context The VS Code extension context
     */
    private async addLazyObserverRegistration(context: vscode.ExtensionContext): Promise<void> {
        const observersRegistered = await this.addObservers(context);
        if (observersRegistered) {
            return;
        }

        const phpFileWatcher = vscode.workspace.createFileSystemWatcher("**/*.php", false, false, true);
        phpFileWatcher.onDidCreate(async (uri) => {
            const observersRegistered = await this.addObservers(context);
            if (observersRegistered) {
                phpFileWatcher.dispose();
            }
        });

        context.subscriptions.push(phpFileWatcher);
    }

    /**
     * Registers all observers with VS Code
     * @param context The VS Code extension context
     */
    private async addObservers(context: vscode.ExtensionContext): Promise<boolean> {
        if (this.hasObserversRegistered || !(await this.hasPhpFilesInWorkspace())) {
            return false;
        }
        this.hasObserversRegistered = true;

        const observerRegisty = ObserverRegistry;
        for (const [observerName, observer] of Object.entries(observerRegisty)) {
            this.addObserver(context, observerName, observer);
        }
        return true;
    }

    /**
     * Registers a single observer with VS Code
     * @param context The VS Code extension context
     * @param name The name of the observer
     * @param observer The constructor type of the observer to register
     */
    private addObserver(
        context: vscode.ExtensionContext,
        name: string,
        observer: ConstructorType<FilesystemObserverInterface>
    ): void {
        const observerInstance = this.container.get(observer);
        if (!observerInstance) {
            console.error(`Observer \`${name}\` not found`);
            return;
        }
        if (typeof observerInstance.watch !== "function") {
            console.error(`Observer \`${name}\` does not implement \`watch\``);
            return;
        }
        observerInstance.watch(context);
    }

    /**
     * Checks if there are PHP files in the workspace (outside of vendor directories)
     * @returns Promise that resolves to true if PHP files are found, false otherwise
     */
    private async hasPhpFilesInWorkspace(): Promise<boolean> {
        if (!vscode.workspace.workspaceFolders?.length) {
            return false;
        }

        try {
            const phpFiles = await vscode.workspace.findFiles("**/*.php", "**/vendor/**", 1);
            return phpFiles.length > 0;
        } catch (error) {
            console.error("Error checking for PHP files:", error);
            return false;
        }
    }

    /**
     * Deactivates the extension and cleans up resources
     * @returns This extension instance for chaining
     */
    public deactivate(): this {
        return this;
    }
}
