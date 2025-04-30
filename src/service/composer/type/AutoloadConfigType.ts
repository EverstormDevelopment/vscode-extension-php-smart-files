/**
 * Represents a mapping from namespace prefixes to directory paths
 * for PSR-0 or PSR-4 autoloading in composer.json
 * The key is the namespace prefix and the value is an array of directories
 */
export type AutoloadConfigType = Record<string, string[]>;