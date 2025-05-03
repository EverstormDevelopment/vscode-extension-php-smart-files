import * as vscode from 'vscode';

export interface ExtensionInterface
{
    activate(context: vscode.ExtensionContext): this;
    
    deactivate(): this;
}