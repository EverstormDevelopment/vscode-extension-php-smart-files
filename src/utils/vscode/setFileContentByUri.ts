import * as vscode from "vscode";
import { findDocumentByUri } from "./findDocumentByUri";

/**
 * Sets the content of a file identified by its URI. This function handles both
 * open files and files that are not currently open in the editor. For open files,
 * it uses WorkspaceEdit to modify the content and preserves the dirty state.
 * For files not open in the editor, it writes directly to the filesystem.
 * @param uri - The URI of the file to modify
 * @param content - The new content to set
 * @returns A promise that resolves when the operation is complete
 */
export async function setFileContentByUri(uri: vscode.Uri, content: string): Promise<void> {
    const document = findDocumentByUri(uri);
    if (!document) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
        return;
    }

    const wasDirty = document.isDirty;
    const textLength = document.getText().length;
    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(textLength));

    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, fullRange, content);
    await vscode.workspace.applyEdit(edit);

    if (!wasDirty) {
        await document.save();
    }
}
