import * as vscode from "vscode";
import { FileRenameOperationTypeEnum } from "../enum/FileRenameOperationTypeEnum";

/**
 * Event data for file rename operations
 */
export interface FileRenameOperationEvent {
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
    operationType: FileRenameOperationTypeEnum;
}
