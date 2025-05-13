import * as vscode from "vscode";

export type NamespaceRefactorUriDetailsType = {
    uri: vscode.Uri;
    identifier: string;
    namespace: string;
    fileName: string;
    isFileNameValid: boolean;
};
