import * as vscode from "vscode";
import { IdentifierType } from "./IdentifierType";

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
     * The PHP file identifier (used as name of the class/interface/trait/enum)
     */
    fileIdentifier: IdentifierType;

    /**
     * The invalid or problematic file identifier value when isIdentifierValid is false
     * Stores the original, non-sanitized identifier string
     */
    fileIdentifierInvalid?: string;

    /**
     * Indicates whether the file identifier follows PHP naming conventions
     * and is valid in the current context
     */
    isFileIdentifierValid: boolean;
};
