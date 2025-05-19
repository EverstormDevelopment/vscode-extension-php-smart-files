import * as vscode from "vscode";
import { FilesystemObserverOperationEnum } from "../enum/FilesystemObserverOperationEnum";
import { FilesystemObserverResourceEnum } from "../enum/FilesystemObserverResourceEnum";

/**
 * Event data for file rename operations
 */
export interface FilesystemObserverEvent {
    /**
     * Original URI of the file before renaming
     */
    oldUri: vscode.Uri;

    /**
     * New URI of the file after renaming
     */
    newUri: vscode.Uri;

    /**
     * Type of filesystem resource (file or directory)
     */
    resource: FilesystemObserverResourceEnum;

    /**
     * Type of operation performed
     */
    operation: FilesystemObserverOperationEnum;
}
