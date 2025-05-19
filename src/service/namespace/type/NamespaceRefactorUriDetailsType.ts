import * as vscode from "vscode";

/**
 * Type definition for URI-specific details used in namespace refactoring operations.
 * Contains file location and PHP namespace information for a specific file state.
 */
export type NamespaceRefactorUriDetailsType = {
    /**
     * The VSCode URI reference to the file location
     */
    uri: vscode.Uri;

    /**
     * The PHP namespace of the file
     */
    namespace: string;

    /**
     * The invalid or problematic namespace value when isNamespaceValid is false
     * Stores the original, non-sanitized namespace string
     */
    namespaceInvalid?: string;

    /**
     * Indicates whether the namespace follows PHP namespace conventions and is valid
     * in the current context
     */
    isNamespaceValid: boolean;

    /**
     * The PHP class/interface/trait identifier (name)
     */
    identifier: string;

    /**
     * The invalid or problematic identifier value when isIdentifierValid is false
     * Stores the original, non-sanitized identifier string
     */
    identifierInvalid?: string

    /**
     * Indicates whether the class/interface/trait identifier follows PHP naming conventions
     * and is valid in the current context
     */
    isIdentifierValid: boolean;
};
