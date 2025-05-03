import * as vscode from "vscode";

export interface PhpSnippetTypeFactoryInterface {
    create(identifier?: string, namespace?: string): vscode.SnippetString;
}
