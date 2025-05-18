import * as vscode from "vscode";
import { InputBoxInterface } from "../interface/InputInterface";
import { InputBoxOptionsType } from "../type/InputBoxOptionsType";

/**
 * Implementation of an input box for collecting user input.
 * Wraps VS Code's native input box with additional validation and processing capabilities.
 */
export class InputBox implements InputBoxInterface {
    /**
     * Function to resolve the user input when the input box is closed.
     * Used as part of the Promise-based API to return the result asynchronously.
     */
    private resolveInput: (value: string | undefined) => void = () => {};

    /**
     * Creates a new InputBox instance.
     * @param options Configuration options for the input box
     * @param inputBox The VS Code input box instance to use
     */
    constructor(
        protected readonly options: InputBoxOptionsType = {},
        private readonly inputBox = vscode.window.createInputBox()
    ) {
        this.configureUI();
        this.configureBehaviour();
    }

    /**
     * Configures the UI properties of the input box based on provided options.
     */
    private configureUI(): void {
        const { title, value, prompt, placeholder, password, ignoreFocusOut } = this.options;

        this.inputBox.title = title || "";
        this.inputBox.value = value || "";
        this.inputBox.prompt = prompt || "";
        this.inputBox.placeholder = placeholder || "";
        this.inputBox.password = password || false;
        this.inputBox.ignoreFocusOut = ignoreFocusOut || false;
    }

    /**
     * Configures the behavior of the input box, including event handlers.
     */
    private configureBehaviour(): void {
        this.configureOnChangeValue();
        this.configureOnAccept();
        this.configureOnHide();
    }

    /**
     * Configures the behavior when the input value changes.
     */
    private configureOnChangeValue(): void {
        this.inputBox.onDidChangeValue(async (value: string) => this.validate(value));
    }

    /**
     * Configures the behavior when the user accepts the input.
     */
    private configureOnAccept(): void {
        this.inputBox.onDidAccept(async () => {
            if (!this.resolveInput) {
                throw new Error("No input resolver function provided.");
            }

            const value = this.inputBox.value;
            const isValueValid = await this.validate(value);
            if (!isValueValid) {
                return;
            }

            const input = await this.processInput(value);
            this.resolveInput(input);
            this.inputBox.hide();
        });
    }

    /**
     * Configures the behavior when the input box is hidden.
     */
    private configureOnHide(): void {
        this.inputBox.onDidHide(() => {
            if (!this.resolveInput) {
                throw new Error("No input resolver function provided.");
            }

            if (this.inputBox.validationMessage) {
                return;
            }

            this.resolveInput(undefined);
        });
    }

    /**
     * Validates the input value using the configured validator.
     * Sets the validation message in the input box UI.
     * @param value The input value to validate
     * @returns True if the input is valid, false otherwise
     */
    private async validate(value: string): Promise<boolean> {
        const validationResult = await this.options.inputValidator?.validate(value);

        if (validationResult === undefined) {
            this.inputBox.validationMessage = "";
            return true;
        }

        this.inputBox.validationMessage = validationResult.message;
        return validationResult.severity !== vscode.InputBoxValidationSeverity.Error;
    }

    /**
     * Processes the validated input value using the configured processor.
     * @param input The validated input value
     * @returns The processed input value
     */
    private async processInput(input: string): Promise<string> {
        return this.options.inputProcessor?.process(input) || input;
    }

    /**
     * Prompts the user for input and returns the result.
     * @returns A promise resolving to the user input or undefined if canceled
     */
    public async prompt(): Promise<string | undefined> {
        return new Promise<string | undefined>((resolve) => {
            this.resolveInput = resolve;
            this.inputBox.show();
        });
    }
}
