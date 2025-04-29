import * as vscode from "vscode";
import { InputServiceInterface } from "./interface/InputServiceInterface";

/**
 * Configuration options for input services
 */
export interface InputServiceOptions {
    /**
     * The title of the input box
     */
    title?: string;

    /**
     * The placeholder text to display in the input box
     */
    placeholder?: string;

    /**
     * The prompt text to display below the input box
     */
    prompt?: string;

    /**
     * The value to pre-fill in the input box
     */
    value?: string;
}

/**
 * Abstract base class for input services
 */
export abstract class AbstractInputService implements InputServiceInterface {
    /**
     * Constructor for AbstractInputService
     * @param options Configuration options for the input service
     */
    constructor(protected options: InputServiceOptions = {}) {}

    /**
     * Configures the input service with new options
     * @param options New options to apply
     */
    public configure(options: InputServiceOptions): void {
        // Update options, preserving any existing values not overridden
        this.options = {
            ...this.options,
            ...options
        };
    }

    /**
     * Prompts user for input with configured options
     * @returns Promise resolving to the user input or undefined if canceled
     */
    public async promptForInput(): Promise<string | undefined> {
        const inputBox = vscode.window.createInputBox();
        
        if (this.options.title) {
            inputBox.title = this.options.title;
        }
        
        if (this.options.placeholder) {
            inputBox.placeholder = this.options.placeholder;
        }
        
        if (this.options.prompt) {
            inputBox.prompt = this.options.prompt;
        }
        
        if (this.options.value) {
            inputBox.value = this.options.value;
        }

        return new Promise<string | undefined>((resolve) => {
            // Handle input acceptance
            inputBox.onDidAccept(async () => {
                const value = inputBox.value;
                const validationResult = await this.validateInput(value);
                
                if (validationResult) {
                    inputBox.validationMessage = validationResult;
                    return;
                }
                
                inputBox.hide();
                resolve(this.processInput(value));
            });
            
            // Handle input cancellation
            inputBox.onDidHide(() => {
                if (inputBox.validationMessage) {
                    return; // Don't resolve if hiding due to validation error
                }
                resolve(undefined);
            });
            
            inputBox.show();
        });
    }

    /**
     * Validates the user input
     * @param input The user input to validate
     * @returns Validation error message or undefined if input is valid
     */
    protected abstract validateInput(input: string): Promise<string | undefined>;
    
    /**
     * Processes the validated input before returning
     * @param input The validated user input
     * @returns The processed input
     */
    protected processInput(input: string): string {
        return input;
    }
}