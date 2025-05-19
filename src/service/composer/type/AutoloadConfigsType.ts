import { AutoloadConfigType } from "./AutoloadConfigType";

/**
 * Contains the PSR-0 and PSR-4 autoloading configurations from composer.json.
 * This type organizes autoload configurations by their PSR standard type.
 *
 * @example
 * {
 *   psr4: { "App\\": ["src/"] },
 *   psr0: { "Legacy\\": ["legacy/"] }
 * }
 */
export type AutoloadConfigsType = {
    /**
     * PSR-4 autoloading configuration where namespace prefixes map directly to directories
     */
    psr4?: AutoloadConfigType;

    /**
     * PSR-0 autoloading configuration with underscores in class names mapping to directory separators
     */
    psr0?: AutoloadConfigType;
};
