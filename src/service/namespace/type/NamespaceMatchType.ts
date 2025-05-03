/**
 * Type definition representing a match between a directory and its corresponding PHP namespace.
 */
export type NamespaceMatchType = {
    /**
     * The directory path associated with the namespace
     */
    directory: string;
    
    /**
     * The PHP namespace associated with the directory
     */
    namespace: string
}