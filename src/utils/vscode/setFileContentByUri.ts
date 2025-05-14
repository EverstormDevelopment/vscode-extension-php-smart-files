import * as vscode from "vscode";
import { findEditorByUri } from "./findEditorByUri";

/**
 * Sets the content of a file by its URI. If the file is open in an
 * editor, it updates the content in the editor. Otherwise, it writes
 * the content to the filesystem.
 * @param uri - The URI of the file to write.
 * @param content - The content to write to the file.
 */
export async function setFileContentByUri(uri: vscode.Uri, content: string): Promise<void> {
    const openEditor = findEditorByUri(uri);
    if (!openEditor) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
        return;
    }

    const wasDirty = openEditor.document.isDirty;
    const fullRange = new vscode.Range(
        openEditor.document.positionAt(0),
        openEditor.document.positionAt(openEditor.document.getText().length)
    );

    await openEditor.edit((editBuilder) => {
        editBuilder.replace(fullRange, content);
    });

    if (!wasDirty) {
        await openEditor.document.save();
    }
}
