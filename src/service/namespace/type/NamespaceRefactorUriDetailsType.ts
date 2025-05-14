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
     * The PHP class/interface/trait identifier (name)
     */
    identifier: string;

    /**
     * The PHP namespace of the file
     */
    namespace: string;

    /**
     * The filename without path
     */
    fileName: string;

    /**
     * Flag indicating if the filename is a valid PHP identifier
     */
    isFileNameValid: boolean;
};
