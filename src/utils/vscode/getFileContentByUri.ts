import * as vscode from "vscode";
import { findEditorByUri } from "./findEditorByUri";

/**
 * Retrieves the content of a file by its URI. If the file is open in
 * an editor, it returns the content from the editor. Otherwise, it
 * reads the file from the filesystem.
 * @param uri - The URI of the file to read.
 * @returns The content of the file as a string.
 */
export async function getFileContentByUri(uri: vscode.Uri): Promise<string> {
    const editor = findEditorByUri(uri);
    if (editor) {
        return editor.document.getText();
    }

    const fileContent = await vscode.workspace.fs.readFile(uri);
    return fileContent.toString();
}
