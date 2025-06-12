import * as vscode from "vscode";
import { FileTypeEnum } from "../../../utils/php/enum/FileTypeEnum";

/**
 * Interface for PHP snippet factory implementations.
 */
export interface SnippetFactoryInterface {
    /**
     * Creates a PHP snippet based on the specified type.
     * @param type The type of PHP snippet to create
     * @param identifier Optional name/identifier for the PHP element
     * @param namespace Optional namespace for the PHP element
     * @returns A VS Code snippet string representing the PHP code
     */
    create(type: FileTypeEnum, identifier?: string, namespace?: string): vscode.SnippetString;
}
