import * as vscode from "vscode";
import { findPhpFiles } from "../../../utils/filesystem/findPhpFiles";
import { escapeRegExp } from "../../../utils/regex/escapeRegExp";

export class NamespaceRefactorer {
    public async updateFileAndReferences(
        newUri: vscode.Uri,
        oldNamespace: string,
        newNamespace: string,
        identifier: string
    ): Promise<void> {
        await this.updateFile(newUri, newNamespace);
        await this.updateReferences(`${oldNamespace}\\${identifier}`, `${newNamespace}\\${identifier}`);
    }

    public async updateFile(uri: vscode.Uri, namespace: string): Promise<void> {
        try {
            const fileContent = await this.getFileContent(uri);

            const namespaceRegex = /[^\r\n]*namespace\s+[\w\\]+;/m;
            const match = fileContent.match(namespaceRegex);
            if (!match) {
                return;
            }

            const updatedContent = fileContent.replace(namespaceRegex, `namespace ${namespace};`);
            await this.updateFileContent(uri, updatedContent);
        } catch (error) {}
    }

    public async updateReferences(oldNamespace: string, newNamespace: string): Promise<void> {
        const phpFiles = await findPhpFiles();

        // Track progress with a notification
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Updating references from "${oldNamespace}" to "${newNamespace}"`,
                cancellable: false,
            },
            async (progress) => {
                const progressIncrement = 100 / phpFiles.length;

                for (let i = 0; i < phpFiles.length; i++) {
                    const uri = phpFiles[i];

                    progress.report({
                        increment: progressIncrement,
                        message: `Processing file ${i + 1} of ${phpFiles.length}`,
                    });

                    await this.updateReference(uri, oldNamespace, newNamespace);
                }
            }
        );
    }

    private async updateReference(uri: vscode.Uri, oldNamespace: string, newNamespace: string): Promise<void> {
        try {
            const fileContent = await this.getFileContent(uri);

            // Return early if the file doesn't contain the old namespace at all
            if (!fileContent.includes(oldNamespace)) {
                return;
            }

            let updated = false;

            // Replace use statements (e.g., "use OldNamespace\Something;")
            const useRegex = new RegExp(`use\\s+${escapeRegExp(oldNamespace)}\s*;`, "g");
            const updatedText1 = fileContent.replace(useRegex, (match, suffix) => {
                updated = true;
                return `use ${newNamespace};`;
            });

            // Replace fully qualified class names (e.g., "OldNamespace\Something")
            const fqcnRegex = new RegExp(`\\b${escapeRegExp(oldNamespace)}`, "g");
            const updatedText2 = updatedText1.replace(fqcnRegex, () => {
                updated = true;
                return `${newNamespace}`;
            });

            if (!updated) {
                return;
            }

            // Apply the changes to the file
            await this.updateFileContent(uri, updatedText2);
        } catch (error) {
            console.error(`Error updating references in file ${uri.fsPath}:`, error);
        }
    }

    private async getFileContent(uri: vscode.Uri): Promise<string> {
        const editor = this.findOpenEditor(uri);
        if (editor) {
            return editor.document.getText();
        }

        const fileContent = await vscode.workspace.fs.readFile(uri);
        return fileContent.toString();
    }

    private async updateFileContent(uri: vscode.Uri, content: string): Promise<void> {
        const openEditor = this.findOpenEditor(uri);
        if (!openEditor) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
            return;
        }

        const isDirty = openEditor.document.isDirty;
        const fullRange = new vscode.Range(
            openEditor.document.positionAt(0),
            openEditor.document.positionAt(openEditor.document.getText().length)
        );

        await openEditor.edit((editBuilder) => {
            editBuilder.replace(fullRange, content);
        });

        if (!isDirty) {
            await openEditor.document.save();
        }
    }

    private findOpenEditor(uri: vscode.Uri): vscode.TextEditor | undefined {
        return vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === uri.toString());
    }
}