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
     * The PHP class/interface/trait identifier (name)
     */
    identifier: string;

    /**
     * Indicates whether the namespace follows PHP namespace conventions and is valid
     * in the current context
     */
    isNamespaceValid: boolean;

    /**
     * Indicates whether the class/interface/trait identifier follows PHP naming conventions
     * and is valid in the current context
     */
    isIdentifierValid: boolean;
};
