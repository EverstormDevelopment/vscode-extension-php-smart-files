import * as vscode from "vscode";
import { FilesystemOperationTypeEnum } from "../enum/FilesystemOperationTypeEnum";

/**
 * Event data for file rename operations
 */
export interface FilesystemOperationEvent {
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
    operationType: FilesystemOperationTypeEnum;
}
