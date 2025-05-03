import { InputProcessorInterface } from "../interface/InputProcessorInterface";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Configuration options for VS Code input boxes.
 */
export type InputBoxOptionsType = {
    /**
     * An optional string that represents the title of the input box.
     */
    title?: string;

    /**
     * The value to pre-fill in the input box.
     */
    value?: string;

    /**
     * The text to display underneath the input box.
     */
    prompt?: string;

    /**
     * An optional string to show as placeholder in the input box to guide the user what to type.
     */
    placeholder?: string;

    /**
     * Controls if a password input is shown. Password input hides the typed text.
     */
    password?: boolean;

    /**
     * Set to `true` to keep the input box open when focus moves to another part of the editor or to another window.
     * This setting is ignored on iPad and is always false.
     */
    ignoreFocusOut?: boolean;

    /**
     * An optional validator class that implements the {@linkcode InputValidatorInterface} interface.
     * The validator method `validate` is called whenever the input changes and can be used 
     * to provide custom validation messages.
     */
    inputValidator?: InputValidatorInterface;

    /**
     * An optional processor class that implements the {@linkcode InputProcessorInterface} interface.
     * The processor method `process` is called whenever the input was confirmed and can be used 
     * to transform the input value before it's returned.
     */
    inputProcessor?: InputProcessorInterface;
};
