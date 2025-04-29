import { InputBoxInterface } from "../interface/InputInterface";
import { InputProcessorInterface } from "../interface/InputProcessorInterface";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";
import { InputBox } from "../model/InputBox";
import { InputBoxOptionsType } from "../type/InputBoxOptionsType";

/**
 * Builder class for creating and configuring an InputBox instance.
 * Provides a fluent API to set various options for the InputBox.
 */
export class InputBoxBuilder {
    /**
     * Stores the configuration options for the InputBox.
     */
    private options: InputBoxOptionsType = {};

    /**
     * Sets the title of the InputBox.
     * @param title The title to display on the InputBox.
     * @returns The current instance of InputBoxBuilder for method chaining.
     */
    public setTitle(title: string): this {
        this.options.title = title;
        return this;
    }

    /**
     * Sets the initial value of the InputBox.
     * @param value The initial value to pre-fill in the InputBox.
     * @returns The current instance of InputBoxBuilder for method chaining.
     */
    public setValue(value: string): this {
        this.options.value = value;
        return this;
    }

    /**
     * Sets the prompt text for the InputBox.
     * @param prompt The prompt text to display below the InputBox.
     * @returns The current instance of InputBoxBuilder for method chaining.
     */
    public setPrompt(prompt: string): this {
        this.options.prompt = prompt;
        return this;
    }

    /**
     * Sets the placeholder text for the InputBox.
     * @param placeholder The placeholder text to display inside the InputBox.
     * @returns The current instance of InputBoxBuilder for method chaining.
     */
    public setPlaceholder(placeholder: string): this {
        this.options.placeholder = placeholder;
        return this;
    }

    /**
     * Configures the InputBox to mask input as a password field.
     * @param password True to mask input, false otherwise.
     * @returns The current instance of InputBoxBuilder for method chaining.
     */
    public setPassword(password: boolean): this {
        this.options.password = password;
        return this;
    }

    /**
     * Configures whether the InputBox should ignore focus out events.
     * @param ignoreFocusOut True to keep the InputBox open when focus is lost, false otherwise.
     * @returns The current instance of InputBoxBuilder for method chaining.
     */
    public setIgnoreFocusOut(ignoreFocusOut: boolean): this {
        this.options.ignoreFocusOut = ignoreFocusOut;
        return this;
    }

    /**
     * Sets the input validator for the InputBox.
     * @param inputValidator The validator to use for validating user input.
     * @returns The current instance of InputBoxBuilder for method chaining.
     */
    public setInputValidator(inputValidator: InputValidatorInterface): this {
        this.options.inputValidator = inputValidator;
        return this;
    }

    /**
     * Sets the input processor for the InputBox.
     * @param inputProcessor The processor to use for processing user input.
     * @returns The current instance of InputBoxBuilder for method chaining.
     */
    public setInputProcessor(inputProcessor: InputProcessorInterface): this {
        this.options.inputProcessor = inputProcessor;
        return this;
    }

    /**
     * Builds and returns a new InputBox instance with the currently configured options.
     * @returns A new InputBox instance configured with the builder options.
     */
    public build(): InputBoxInterface {
        return new InputBox(this.options);
    }

    /**
     * Resets the builder to its initial state, clearing all configured options.
     * @returns The current instance of InputBoxBuilder for method chaining.
     */
    public reset(): this {
        this.options = {};
        return this;
    }
}

