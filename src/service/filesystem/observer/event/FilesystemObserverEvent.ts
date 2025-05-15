import * as vscode from "vscode";
import { FilesystemOperationEnum } from "../enum/FilesystemOperationEnum";

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
     * Type of operation performed
     */
    operation: FilesystemOperationEnum;
}
