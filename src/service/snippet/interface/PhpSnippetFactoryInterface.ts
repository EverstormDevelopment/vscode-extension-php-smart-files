import * as vscode from "vscode";
import { PhpSnippetFactoryTypeEnum } from "../enum/PhpSnippetFactoryTypeEnum";

export interface PhpSnippetFactoryInterface {
    create(type: PhpSnippetFactoryTypeEnum, identifier?: string, namespace?: string): vscode.SnippetString;
}
