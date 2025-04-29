import * as vscode from "vscode";
import { AbstractInputService, InputServiceOptions } from "./AbstractInputService";

/**
 * Options for PHP filename input service
 */
export interface PhpFilenameInputOptions extends InputServiceOptions {
    /**
     * Whether to append .php extension to the filename
     */
    appendPhpExtension?: boolean;
}

/**
 * Service for collecting PHP filenames from user input
 */
export class PhpFilenameInputService extends AbstractInputService {
    /**
     * Default options for PHP filename input
     */
    private static readonly DEFAULT_OPTIONS: PhpFilenameInputOptions = {
        title: "Enter PHP Filename",
        placeholder: "Enter filename (without .php)",
        prompt: "Enter a name for the new PHP file",
        appendPhpExtension: true
    };
    
    /**
     * Constructor for PhpFilenameInputService
     * @param options Configuration options for the service
     */
    constructor(options: PhpFilenameInputOptions = {}) {
        // Merge provided options with defaults
        super({
            ...PhpFilenameInputService.DEFAULT_OPTIONS,
            ...options
        });
    }
    
    /**
     * Validates the filename input
     * @param input The user input to validate
     * @returns Validation error message or undefined if valid
     */
    protected async validateInput(input: string): Promise<string | undefined> {
        if (!input || input.trim().length === 0) {
            return vscode.l10n.t("Please enter a valid filename");
        }
        
        // Validate filename (no invalid characters)
        const invalidChars = /[\\/:*?"<>|]/;
        if (invalidChars.test(input)) {
            return vscode.l10n.t("Filename contains invalid characters");
        }
        
        return undefined;
    }
    
    /**
     * Processes the validated filename input
     * @param input The validated filename input
     * @returns The processed filename, with .php extension if configured
     */
    protected processInput(input: string): string {
        const options = this.options as PhpFilenameInputOptions;
        if (options.appendPhpExtension) {
            // Check if input already has .php extension
            if (!input.toLowerCase().endsWith(".php")) {
                return `${input}.php`;
            }
        }
        return input;
    }
}