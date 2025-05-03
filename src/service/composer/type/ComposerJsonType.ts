/**
 * Type representing the structure of a composer.json file.
 */
export interface ComposerJsonType {
    /**
     * Name of the package
     */
    name?: string;

    /**
     * Version of the package
     */
    version?: string;

    /**
     * Description of the package
     */
    description?: string;

    /**
     * Type of the package
     */
    type?: string;

    /**
     * License of the package
     */
    license?: string;

    /**
     * Authors of the package
     */
    authors?: Array<{
        name?: string;
        email?: string;
        homepage?: string;
        role?: string;
    }>;

    /**
     * Required dependencies
     */
    require?: Record<string, string>;

    /**
     * Development dependencies
     */
    "require-dev"?: Record<string, string>;

    /**
     * Autoload configuration
     */
    autoload?: {
        /**
         * PSR-4 autoload mappings
         */
        "psr-4"?: Record<string, string | string[]>;

        /**
         * PSR-0 autoload mappings
         */
        "psr-0"?: Record<string, string | string[]>;

        /**
         * Classmap autoload paths
         */
        classmap?: string[];

        /**
         * Files to include
         */
        files?: string[];
    };

    /**
     * Development autoload configuration
     */
    "autoload-dev"?: {
        /**
         * PSR-4 autoload mappings for development
         */
        "psr-4"?: Record<string, string | string[]>;

        /**
         * PSR-0 autoload mappings for development
         */
        "psr-0"?: Record<string, string | string[]>;

        /**
         * Classmap autoload paths for development
         */
        classmap?: string[];

        /**
         * Files to include for development
         */
        files?: string[];
    };

    /**
     * Other properties that might be in the composer.json file
     */
    [key: string]: unknown;
}
