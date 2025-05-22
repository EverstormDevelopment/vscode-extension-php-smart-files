import * as vscode from "vscode";
import { findDocumentByUri } from "./findDocumentByUri";

/**
 * Retrieves the content of a file by its URI. This function first checks if the file
 * is already open in an editor, in which case it reads from the document in memory.
 * Otherwise, it reads the file directly from the filesystem to get its content.
 * @param uri - The URI of the file to read
 * @returns A promise that resolves to the content of the file as a string
 */
export async function getFileContentByUri(uri: vscode.Uri): Promise<string> {
    const document = findDocumentByUri(uri);
    if (document) {
        return document.getText();
    }

    const fileContent = await vscode.workspace.fs.readFile(uri);
    return fileContent.toString();
}
