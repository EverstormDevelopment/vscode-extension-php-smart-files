import { InputServiceInterface } from "./interface/InputServiceInterface";
import { PhpFilenameInputService, PhpFilenameInputOptions } from "./PhpFilenameInputService";

/**
 * Factory for creating input service instances
 */
export class InputServiceFactory {
    /**
     * Creates a PHP filename input service with the given options
     * @param options Configuration options for the PHP filename input service
     * @returns Configured PHP filename input service
     */
    public static createPhpFilenameInputService(options: PhpFilenameInputOptions = {}): InputServiceInterface {
        return new PhpFilenameInputService(options);
    }

    /**
     * Creates a PHP class filename input service with appropriate defaults
     * @param options Optional configuration options to override defaults
     * @returns Configured PHP class filename input service
     */
    public static createPhpClassFilenameInputService(options: PhpFilenameInputOptions = {}): InputServiceInterface {
        return new PhpFilenameInputService({
            title: "Create new PHP class file",
            placeholder: "Enter class name (without .php)",
            prompt: "Enter a name for the new PHP class file",
            ...options
        });
    }

    /**
     * Creates a PHP empty file input service with appropriate defaults
     * @param options Optional configuration options to override defaults
     * @returns Configured PHP empty file input service
     */
    public static createPhpEmptyFileInputService(options: PhpFilenameInputOptions = {}): InputServiceInterface {
        return new PhpFilenameInputService({
            title: "Create new empty PHP file",
            placeholder: "Enter filename (without .php)",
            prompt: "Enter a name for the new PHP file",
            ...options
        });
    }
}