import * as vscode from "vscode";
import { ContainerFactory } from "../../container/build/ContainerFactory";
import { ContainerInterface } from "../../container/interface/ContainerInterface";
import { ConstructorType } from "../../container/type/ConstructorType";
import { FilesystemObserverInterface } from "../../service/filesystem/observer/interface/FilesystemObserverInterface";
import { FileTypeEnum } from "../../service/php/enum/FileTypeEnum";
import { GlobalReservedService } from "../../service/php/service/GlobalReservedService";
import { ExtensionInterface } from "../interface/ExtensionInterface";
import { FileGenerationCommandRegistry } from "../registry/FileGenerationCommandRegistry";
import { ObserverRegistry } from "../registry/ObserverRegistry";
import { FileGenerationCommand } from "./../command/FileGenerationCommand";

/**
 * The main extension class that handles the extension lifecycle.
 */
export class Extension implements ExtensionInterface {
    /**
     * The extension name from the package.json manifest
     */
    private name: string;

    /**
     * The extension version from the package.json manifest
     */
    private version: string;

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
        this.name = "php-smart-files";
        this.version = "0.0.0";
        this.container = ContainerFactory.createDefaultContainer();
    }

    /**
     * Activates the extension, initializing all dependencies and registering commands
     * @param context The VS Code extension context
     * @returns This extension instance for chaining
     */
    public activate(context: vscode.ExtensionContext): this {
        this.initialize(context);
        this.showActivationMessage(context);
        this.addGlobalReservedObserver(context);
        this.addFileCreationCommands(context);
        this.addLazyFileObserver(context);
        return this;
    }

    /**
     * Initializes extension metadata from context
     * @param context The VS Code extension context
     */
    private initialize(context: vscode.ExtensionContext): void {
        // this.id = context.extension.id;
        this.name = context.extension.packageJSON.name;
        this.version = context.extension.packageJSON.version;
    }

    /**
     * Displays an activation message to the user if the extension version has changed.
     * It informs the user about the new version and provides links to the changelog and settings.
     * @param context The VS Code extension context
     */
    private showActivationMessage(context: vscode.ExtensionContext): void {
        const previousVersion = context.globalState.get<string>("extensionVersion") || "1.0.0";
        const previousMajorMinor = previousVersion.split(".").slice(0, 2).join(".");
        const currentMajorMinor = this.version?.split(".").slice(0, 2).join(".");
        if (currentMajorMinor === previousMajorMinor) {
            return;
        }

        const message = vscode.l10n.t(
            "PHP Smart Files {0} is ready! See what’s new and customize it in your settings.",
            this.version
        );
        const changelogButton = vscode.l10n.t("Changelog");
        const settingsButton = vscode.l10n.t("Settings");

        vscode.window.showInformationMessage(`🎉 ` + message, changelogButton, settingsButton).then((selection) => {
            if (selection === changelogButton) {
                const uri = vscode.Uri.parse(
                    "https://github.com/EverstormDevelopment/vscode-extension-php-smart-files/blob/main/CHANGELOG.md"
                );
                vscode.env.openExternal(uri);
            }
            if (selection === settingsButton) {
                vscode.commands.executeCommand("workbench.action.openSettings", "phpSmartFiles");
            }
        });

        context.globalState.update("extensionVersion", this.version);
    }

    /**
     * Registers all observers that keep the global reserved names in sync with workspace changes.
     * @param context The VS Code extension context
     */
    private addGlobalReservedObserver(context: vscode.ExtensionContext): void {
        this.addGlobalReservedComposerObserver(context);
        this.addGlobalReservedConfigObserver(context);
    }

    /**
     * Registers a file system watcher for composer.json and composer.lock files and
     * triggers a reload of global reserved names whenever these files are changed,
     * created, or deleted, ensuring that changes in dependencies are reflected.
     * @param context The VS Code extension context
     */
    private addGlobalReservedComposerObserver(context: vscode.ExtensionContext): void {
        const globalReservedService = this.container.get(GlobalReservedService);
        const composerWatcher = vscode.workspace.createFileSystemWatcher("**/composer.{json,lock}");
        composerWatcher.onDidChange(() => globalReservedService.reload());
        composerWatcher.onDidCreate(() => globalReservedService.reload());
        composerWatcher.onDidDelete(() => globalReservedService.reload());
        context.subscriptions.push(composerWatcher);
    }

    /**
     * Registers a configuration change listener for PHP executable settings and
     * triggers a reload of global reserved names whenever 'php.executablePath' or
     * 'php.validate.executablePath' is changed, so the service always uses the correct PHP binary.
     * @param context The VS Code extension context
     */
    private addGlobalReservedConfigObserver(context: vscode.ExtensionContext): void {
        const globalReservedService = this.container.get(GlobalReservedService);
        const configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
            const affectsPhpExecutablePath = event.affectsConfiguration("php.executablePath");
            const affectsPhpValidateExecutablePath = event.affectsConfiguration("php.validate.executablePath");
            if (!affectsPhpExecutablePath && !affectsPhpValidateExecutablePath) {
                return;
            }
            globalReservedService.reload();
        });
        context.subscriptions.push(configWatcher);
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
     * Lazily registers file observers only when a PHP file is detected in the workspace.
     * Improves startup performance for non-PHP projects.
     */
    private async addLazyFileObserver(context: vscode.ExtensionContext): Promise<void> {
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
