import * as vscode from "vscode";

/**
 * NamespaceRefactorDetailsType represents the details for a namespace refactor operation.
 */
export type NamespaceRefactorDetailsType = {
    oldUri: vscode.Uri;
    newUri: vscode.Uri;
    oldIdentifier: string;
    newIdentifier: string;
    oldNamespace: string;
    newNamespace: string;
    hasNamespaces: boolean;
    hasNamespaceChanged: boolean;
    hasIdentifierChanged: boolean;
    hasChanged: boolean;
};
