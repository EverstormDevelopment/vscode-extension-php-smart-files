import * as vscode from 'vscode';

export interface NamespaceRefactorerInterface {
    refactor(newUri: vscode.Uri, oldUri: vscode.Uri): Promise<boolean>;
}