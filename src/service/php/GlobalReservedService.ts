import { execSync } from "child_process";
import * as vscode from "vscode";
import { isUriFile } from "../../utils/filesystem/isUriFile";
import { CodeIgniterFunctions } from "../../utils/php/constants/CodeIgniterFunctions";
import { GlobalFunctions } from "../../utils/php/constants/GlobalFunctions";
import { LaminasFunctions } from "../../utils/php/constants/LaminasFunctions";
import { LaravelFunctions } from "../../utils/php/constants/LaravelFunctions";
import { PhalconFunctions } from "../../utils/php/constants/PhalconFunctions";
import { ReservedKeywords } from "../../utils/php/constants/ReservedKeywords";
import { SymfonyFunctions } from "../../utils/php/constants/SymfonyFunctions";
import { WordpressFunctions } from "../../utils/php/constants/WordpressFunctions";
import { YiiFunctions } from "../../utils/php/constants/YiiFunctions";
import { ComposerJsonService } from "../composer/model/ComposerJsonService";

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
     * Path to the PHP executable, if available on the system
     */
    private phpPath: string | undefined;

    /**
     * Set of all globally reserved names (functions, keywords, constants)
     */
    private globalReserved: Set<string>;

    /**
     * Flag indicating whether the service has been fully initialized
     */
    private isInitialized: boolean;

    /**
     * Creates a new GlobalReservedService instance.
     *
     * Initializes the service with basic PHP reserved keywords and global functions.
     * The service must be explicitly initialized via the initialize() method to load
     * dynamic and framework-specific reserved names.
     *
     * @param composerService Service for parsing and handling composer.json files
     */
    constructor(private readonly composerService: ComposerJsonService) {
        this.phpPath = undefined;
        // Start with basic PHP reserved keywords and global functions
        this.globalReserved = new Set(...ReservedKeywords, ...GlobalFunctions);
        this.isInitialized = false;
    }

    /**
     * Temporary method for testing initialization.
     * TODO: Replace with proper public API method
     */
    public async foo(): Promise<void> {
        await this.initialize();
    }

    /**
     * Initialize the service by detecting PHP globals from multiple sources.
     *
     * This method performs the following steps:
     * 1. Detects the PHP executable path on the system
     * 2. Loads reserved names from all workspace folders
     *
     * The method is idempotent - calling it multiple times has no additional effect.
     * Falls back gracefully if PHP is not available or if dynamic detection fails.
     */
    private async initialize(): Promise<void> {
        // Prevent multiple initializations
        if (this.isInitialized) {
            return;
        }

        await this.detectPhpPath();
        await this.loadGlobalReserved();
        // TODO: Uncomment when initialization is complete
        // this.isInitialized = true;
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

        const configuredPath = (executablePath || validateExecutablePath)?.trim();
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

        if (this.phpPath) {
            const reserved = await this.extractReservedWithPhp(workspaceUri);
            this.globalReserved = new Set([...this.globalReserved, ...reserved]);
        }

        const hasAutoloader = await this.hasComposerAutoloader(workspaceUri);
        if (!hasAutoloader) {
            const reserved = await this.extractReservedFromComposer(workspaceUri);
            this.globalReserved = new Set([...this.globalReserved, ...reserved]);
        }
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
    private async extractReservedWithPhp(folderUri: vscode.Uri): Promise<Set<string>> {
        if (!this.phpPath) {
            return new Set();
        }

        // PHP code to extract globally defined functions
        const commands = [
            "$autoloaderPath = getcwd() . '/vendor/autoload.php';",
            "if (file_exists($autoloaderPath)) {",
            "    require_once $autoloaderPath;",
            "}",
            "$definedFunctions = get_defined_functions();",
            "$result = array_merge($definedFunctions['internal'], $definedFunctions['user']);",
            "echo json_encode($definedFunctions['user']);",
        ];

        try {
            const phpOutput = execSync(`${this.phpPath} -r "${commands.join("")}"`, {
                encoding: "utf8",
                cwd: folderUri.fsPath,
            });

            const result = JSON.parse(phpOutput);
            if (!Array.isArray(result)) {
                return new Set();
            }

            const filtered = result.filter((func: string) => !func.includes("\\"));
            return new Set(filtered);
        } catch (error) {
            return new Set();
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
    private async extractReservedFromComposer(composerUri: vscode.Uri): Promise<Set<string>> {
        try {
            const composerJson = await this.composerService.parse(composerUri);
            const dependencies = {
                ...composerJson.require,
                ...composerJson["require-dev"],
            };
            if (!dependencies) {
                return new Set();
            }

            let reservedFunctions = new Set<string>();
            const frameworkGlobals: Record<string, Set<string>> = {
                "laravel/framework": LaravelFunctions,
                "symfony/symfony": SymfonyFunctions,
                "codeigniter/framework": CodeIgniterFunctions,
                "laminas/laminas-stdlib": LaminasFunctions,
                "phalcon/phalcon": PhalconFunctions,
                "yiisoft/yii2": YiiFunctions,
                "wordpress/wordpress": WordpressFunctions,
            };

            for (const [framework, functions] of Object.entries(frameworkGlobals)) {
                const isFrameworkUsed = Object.keys(dependencies).some(
                    (dep) => dep === framework || dep.includes(framework.split("/")[0])
                );
                if (!isFrameworkUsed) {
                    continue;
                }
                reservedFunctions = new Set([...reservedFunctions, ...functions]);
            }

            return reservedFunctions;
        } catch (err) {
            return new Set();
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
