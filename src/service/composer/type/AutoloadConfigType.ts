/**
 * Represents a mapping from namespace prefixes to directory paths
 * for PSR-0 or PSR-4 autoloading in composer.json.
 * 
 * The key is the namespace prefix (e.g., "App\\") and the value is an array of directories
 * where classes in that namespace can be found.
 * 
 * @example
 * {
 *   "App\\": ["src/"],
 *   "Tests\\": ["tests/"]
 * }
 */
export type AutoloadConfigType = Record<string, string[]>;