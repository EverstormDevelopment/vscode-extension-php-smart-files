import { execSync } from "child_process";
import path from "path";
import * as vscode from "vscode";
import { isUriFile } from "../../utils/filesystem/isUriFile";
import { ComposerJsonService } from "../composer/model/ComposerJsonService";
import { CodeIgniterConstants } from "./reserved/constants/CodeIgniterConstants";
import { GlobalConstants } from "./reserved/constants/GlobalConstants";
import { LaravelConstants } from "./reserved/constants/LaravelConstants";
import { PhalconConstants } from "./reserved/constants/PhalconConstants";
import { WordpressConstants } from "./reserved/constants/WordpressConstants";
import { CodeIgniterFunctions } from "./reserved/functions/CodeIgniterFunctions";
import { GlobalFunctions } from "./reserved/functions/GlobalFunctions";
import { LaminasFunctions } from "./reserved/functions/LaminasFunctions";
import { LaravelFunctions } from "./reserved/functions/LaravelFunctions";
import { PhalconFunctions } from "./reserved/functions/PhalconFunctions";
import { SymfonyFunctions } from "./reserved/functions/SymfonyFunctions";
import { WordpressFunctions } from "./reserved/functions/WordpressFunctions";
import { YiiFunctions } from "./reserved/functions/YiiFunctions";
import { ReservedKeywords } from "./reserved/keywords/ReservedKeywords";

/**
 * Service responsible for managing and collecting globally reserved names in PHP projects.
 *
 * This service dynamically detects PHP functions, constants, and reserved keywords that are
 * available in the current workspace environment. It combines:
 * - PHP built-in functions and keywords
 * - Framework-specific functions (Laravel, Symfony, CodeIgniter, etc.)
 * - User-defined functions from composer autoloaded packages
 * - Dynamically loaded functions from the actual PHP runtime
 *
 * The service is designed to prevent naming conflicts when generating new PHP code.
 */
export class GlobalReservedService {
    /**
     * Path to the PHP executable, if available on the system.
     */
    private phpPath: string | undefined;

    /**
     * Set of all reserved PHP keywords (lowercase).
     */
    private keywords: Set<string>;

    /**
     * Set of all reserved global PHP function names (lowercase).
     */
    private globalFunctions: Set<string>;

    /**
     * Set of all reserved global PHP constant names (case-sensitive).
     */
    private globalConstants: Set<string>;

    /**
     * Promise that resolves when the service is fully initialized.
     * Used to ensure that initialization is only done once and can be awaited.
     */
    private initializationPromise: Promise<void> | undefined;

    /**
     * Creates a new GlobalReservedService instance.
     * @param composerService Service for parsing and handling composer.json files
     */
    constructor(private readonly composerService: ComposerJsonService) {
        this.keywords = new Set<string>();
        this.globalFunctions = new Set<string>();
        this.globalConstants = new Set<string>();
    }

    /**
     * Forces a full reload of all reserved names and PHP environment state.
     * Use this method when configuration, composer.json, or the PHP runtime changes.
     */
    public async reload(): Promise<void> {
        await this.initialize(true);
    }

    /**
     * Checks if a name is reserved in the current PHP environment (keyword, function, or constant).
     * @param name The name to check
     * @returns True if the name is reserved, otherwise false
     */
    public async isReserved(name: string): Promise<boolean> {
        await this.initialize();
        return (
            (await this.isKeyword(name)) || (await this.isGlobalFunction(name)) || (await this.isGlobalConstant(name))
        );
    }

    /**
     * Checks if a name is a reserved PHP keyword.
     * @param name The name to check
     * @returns True if the name is a PHP keyword, otherwise false
     */
    public async isKeyword(name: string): Promise<boolean> {
        await this.initialize();
        return this.keywords.has(name.toLowerCase());
    }

    /**
     * Checks if a name is a reserved global PHP function.
     * @param name The name to check
     * @returns True if the name is a global PHP function, otherwise false
     */
    public async isGlobalFunction(name: string): Promise<boolean> {
        await this.initialize();
        return this.globalFunctions.has(name.toLowerCase());
    }

    /**
     * Checks if a name is a reserved global PHP constant.
     * @param name The name to check
     * @returns True if the name is a global PHP constant, otherwise false
     */
    public async isGlobalConstant(name: string): Promise<boolean> {
        await this.initialize();
        return this.globalConstants.has(name);
    }

    /**
     * Initializes the service by detecting the PHP path and loading global reserved names.
     * If already initialized, this method will return the existing promise to avoid duplicate work.
     * Use `reload` parameter to force re-initialization.
     * @param reload If true, forces re-initialization even if already done
     */
    private async initialize(reload?: boolean): Promise<void> {
        if (!reload && this.initializationPromise) {
            return this.initializationPromise;
        }
        this.initializationPromise = (async () => {
            this.setDefaultGlobalReserved();
            await this.detectPhpPath();
            await this.loadGlobalReserved();
        })();

        await this.initializationPromise;
    }

    /**
     * Sets the default global reserved names, including PHP keywords and built-in functions.
     */
    private setDefaultGlobalReserved(): void {
        this.keywords = ReservedKeywords;
        this.globalFunctions = GlobalFunctions;
        this.globalConstants = GlobalConstants;
    }

    /**
     * Detect the PHP executable path by checking VS Code configuration and system PATH.
     *
     * Tries the following sources in order:
     * 1. VS Code PHP extension configuration
     * 2. System PATH environment variable
     */
    private async detectPhpPath(): Promise<void> {
        this.phpPath = (await this.getConfiguredPhpPath()) || (await this.getEnvironmentPhpPath());
    }

    /**
     * Retrieves the PHP executable path from VS Code configuration.
     *
     * Checks both 'php.executablePath' and 'php.validate.executablePath' settings
     * and validates that the configured path actually points to a working PHP executable.
     *
     * @returns The configured PHP path if valid, undefined otherwise
     */
    private async getConfiguredPhpPath(): Promise<string | undefined> {
        const phpConfig = vscode.workspace.getConfiguration("php");
        const executablePath = phpConfig.get<string>("executablePath");
        const validateExecutablePath = phpConfig.get<string>("validate.executablePath");

        const configuredPath = (validateExecutablePath || executablePath)?.trim();
        const isValid = await this.validatePhpPath(configuredPath);
        return isValid ? configuredPath : undefined;
    }

    /**
     * Attempts to find PHP in the system PATH environment variable.
     *
     * Uses platform-specific commands to locate the PHP executable:
     * - Windows: 'where php'
     * - Unix/Linux/macOS: 'which php'
     *
     * @returns The PHP path from system PATH if found and valid, undefined otherwise
     */
    private async getEnvironmentPhpPath(): Promise<string | undefined> {
        const isWindows = process.platform === "win32";
        const command = isWindows ? "where php" : "which php";

        try {
            const result = execSync(command, { encoding: "utf8" }).trim();
            if (!result) {
                return undefined;
            }

            const phpPath = result.split("\n")[0].trim();
            const isPathValid = await this.validatePhpPath(phpPath);
            return isPathValid ? phpPath : undefined;
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Validates if the given PHP path is functional by executing 'php -v'.
     *
     * This method ensures that the provided path not only exists but also points
     * to a working PHP executable that can be invoked successfully.
     *
     * @param phpPath The PHP executable path to validate
     * @returns True if the PHP path is valid and executable, false otherwise
     */
    private async validatePhpPath(phpPath?: string): Promise<boolean> {
        if (!phpPath) {
            return false;
        }

        try {
            execSync(`"${phpPath}" -v`, { stdio: "ignore" });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Load globally reserved names from all workspace folders.
     *
     * Iterates through all open workspace folders and extracts reserved names
     * from each one, combining the results into the global reserved set.
     */
    private async loadGlobalReserved(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return;
        }

        for (const folder of workspaceFolders) {
            await this.loadWorkspaceReserved(folder.uri);
        }
    }

    /**
     * Load reserved names from a specific workspace folder.
     *
     * This method attempts to extract reserved names using multiple strategies:
     * 1. Dynamic extraction using PHP runtime (if PHP is available)
     * 2. Static extraction based on composer.json dependencies (if no autoloader)
     *
     * @param workspaceUri URI of the workspace folder to process
     */
    private async loadWorkspaceReserved(workspaceUri: vscode.Uri): Promise<void> {
        const composerUri = await this.composerService.find(workspaceUri);
        if (!composerUri) {
            return;
        }

        await this.loadReservedWithPhp(workspaceUri);
        await this.loadReservedFromComposer(composerUri);
    }

    /**
     * Loads reserved names (functions and constants) dynamically using PHP from the given workspace folder.
     *
     * Executes a PHP script in the context of the workspace folder to extract all global functions and constants
     * (including user-defined and Composer-loaded) and merges them into the internal sets.
     *
     * @param workspaceUri URI of the workspace folder
     */
    private async loadReservedWithPhp(workspaceUri: vscode.Uri): Promise<void> {
        if (!this.phpPath) {
            return;
        }

        const reserved = await this.extractReservedWithPhp(workspaceUri);
        if (!reserved) {
            return;
        }

        this.globalFunctions = new Set([...this.globalFunctions, ...reserved.functions]);
        this.globalConstants = new Set([...this.globalConstants, ...reserved.constants]);
    }

    /**
     * Loads reserved names (functions and constants) statically based on composer.json dependencies.
     *
     * Detects frameworks based on dependencies in composer.json and merges their known global functions
     * and constants into the internal sets. Only used if no Composer autoloader is present.
     *
     * @param composerUri URI of the composer.json file
     */
    private async loadReservedFromComposer(composerUri: vscode.Uri): Promise<void> {
        const composerPathUri = vscode.Uri.file(path.dirname(composerUri.fsPath));
        const hasAutoloader = await this.hasComposerAutoloader(composerPathUri);
        if (hasAutoloader) {
            return;
        }

        const reserved = await this.extractReservedFromComposer(composerUri);
        if (!reserved) {
            return;
        }

        this.globalFunctions = new Set([...this.globalFunctions, ...reserved.functions]);
        this.globalConstants = new Set([...this.globalConstants, ...reserved.constants]);
    }

    /**
     * Extract reserved names by executing PHP code in the workspace context.
     *
     * This method runs PHP code that:
     * 1. Loads the composer autoloader if present
     * 2. Retrieves all defined functions (built-in and user-defined)
     * 3. Filters out namespaced functions to keep only global ones
     *
     * @param folderUri URI of the folder to execute PHP in
     * @returns Set of function names that are globally available
     */
    private async extractReservedWithPhp(
        folderUri: vscode.Uri
    ): Promise<{ functions: Set<string>; constants: Set<string> } | undefined> {
        if (!this.phpPath) {
            return undefined;
        }

        // PHP code to extract globally defined functions and constants
        const commands = [
            "$autoloaderPath = getcwd() . '/vendor/autoload.php';",
            "if (file_exists($autoloaderPath)) {",
            "    require_once $autoloaderPath;",
            "}",
            "$definedFunctions = get_defined_functions();",
            "$allFunctions = array_merge($definedFunctions['internal'], $definedFunctions['user']);",
            "$definedConstants = get_defined_constants();",
            "$allConstants = array_keys($definedConstants);",
            "$result = ['functions' => $allFunctions, 'constants' => $allConstants];",
            "echo json_encode($result);",
        ];

        try {
            const phpOutput = execSync(`${this.phpPath} -r "${commands.join("")}"`, {
                encoding: "utf8",
                cwd: folderUri.fsPath,
            });

            // Parse the output to extract functions and constants
            // and use only the last line which contains the JSON result.
            // Lines before the last line may contain warnings or notices.
            const lines = phpOutput.trim().split("\n");
            const jsonLine = lines[lines.length - 1];
            const result = JSON.parse(jsonLine);
            if (!result?.functions || !result?.constants) {
                return undefined;
            }

            const functions = new Set<string>(
                result.functions
                    .filter((func: string) => !func.includes("\\"))
                    .map((func: string) => func.toLowerCase())
            );

            const constants = new Set<string>(result.constants);

            return { functions, constants };
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Extract reserved names by analyzing composer.json dependencies.
     *
     * This method identifies which PHP frameworks are used in the project
     * based on composer dependencies and includes their known global functions.
     * This serves as a fallback when dynamic PHP extraction is not possible.
     *
     * @param composerUri URI pointing to the composer.json file
     * @returns Set of framework-specific global function names
     */
    private async extractReservedFromComposer(
        composerUri: vscode.Uri
    ): Promise<{ functions: Set<string>; constants: Set<string> } | undefined> {
        try {
            const composerJson = await this.composerService.parse(composerUri);
            const dependencies = {
                ...composerJson.require,
                ...composerJson["require-dev"],
            };
            if (!dependencies) {
                return undefined;
            }

            const reserved = { functions: new Set<string>(), constants: new Set<string>() };
            const frameworkGlobals: Record<string, Set<string>[]> = {
                "laravel/framework": [LaravelFunctions, LaravelConstants],
                "symfony/symfony": [SymfonyFunctions, new Set()],
                "codeigniter/framework": [CodeIgniterFunctions, CodeIgniterConstants],
                "laminas/laminas-stdlib": [LaminasFunctions, new Set()],
                "phalcon/phalcon": [PhalconFunctions, PhalconConstants],
                "yiisoft/yii2": [YiiFunctions, new Set()],
                "wordpress/wordpress": [WordpressFunctions, WordpressConstants],
            };

            for (const [dependency, dependencyReserved] of Object.entries(frameworkGlobals)) {
                const isFrameworkUsed = Object.keys(dependencies).some(
                    (dep) => dep === dependency || dep.includes(dependency.split("/")[0])
                );
                if (!isFrameworkUsed) {
                    continue;
                }

                const [functions, constants] = dependencyReserved;
                reserved.functions = new Set([...reserved.functions, ...functions]);
                reserved.constants = new Set([...reserved.constants, ...constants]);
            }
            return reserved;
        } catch (err) {
            return undefined;
        }
    }

    /**
     * Check if a composer autoloader exists in the workspace.
     *
     * The presence of vendor/autoload.php indicates that composer dependencies
     * have been installed and the autoloader is available for dynamic loading.
     *
     * @param folderUri URI of the workspace folder to check
     * @returns True if vendor/autoload.php exists, false otherwise
     */
    private async hasComposerAutoloader(folderUri: vscode.Uri): Promise<boolean> {
        const autoloadPath = vscode.Uri.joinPath(folderUri, "vendor", "autoload.php");
        return await isUriFile(autoloadPath);
    }
}
