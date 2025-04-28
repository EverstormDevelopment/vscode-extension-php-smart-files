import * as vscode from "vscode";
import { ExplorerCommandInterface } from "../interface/ExplorerCommandInterface";

        /**
         * Helper function to determine the target folder
         */
        import * as path from 'path';
        import * as fs from 'fs';
        function getTargetFolderFromContext(uri?: vscode.Uri): vscode.Uri | undefined {
            // If URI is given (right click on a folder or file)
            if (uri) {
                // If it's a folder, use it
                if (uri.scheme === 'file') {
                    try {
                        const stat = fs.statSync(uri.fsPath);
                        if (stat.isDirectory()) {
                            return uri;
                        } else {
                            // If it's a file, use its parent folder
                            return vscode.Uri.file(path.dirname(uri.fsPath));
                        }
                    } catch (error) {
                        console.error(vscode.l10n.t('Error checking URI path: {0}', String(error)));
                    }
                }
            }
            
            // Fallback: Use the first workspace folder
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                return vscode.workspace.workspaceFolders[0].uri;
            }
            
            return undefined;
        }


export class NewEmptyPhpClassCommand implements ExplorerCommandInterface {
    private commandName: Symbol = Symbol("newEmptyPhpClass");

    getCommandName(): Symbol {
        return this.commandName;
    }

    async execute(uri?: vscode.Uri): Promise<void> {
        // Determine the target folder based on context
        const targetFolder = getTargetFolderFromContext(uri);
        if (!targetFolder) {
            vscode.window.showErrorMessage(vscode.l10n.t('No target folder selected or no workspace opened.'));
            return;
        }

        // Create VS Code-like dialog
        const inputBox = vscode.window.createInputBox();
        inputBox.title = vscode.l10n.t('Create new empty PHP file');
        inputBox.placeholder = vscode.l10n.t('Enter filename (without .php)');
        inputBox.prompt = vscode.l10n.t('Enter a name for the new PHP file');
        
        inputBox.onDidAccept(async () => {
            const fileName = inputBox.value;
            if (!fileName || fileName.length === 0) {
                inputBox.validationMessage = vscode.l10n.t('Please enter a valid filename');
                return;
            }

            inputBox.hide();
            
            // Create path for the new file
            const phpFileName = `${fileName}.php`;
            const filePath = vscode.Uri.joinPath(targetFolder, phpFileName);
            
            try {
                // Check if the file already exists
                try {
                    await vscode.workspace.fs.stat(filePath);
                    // If stat() doesn't throw an error, the file already exists
                    const overwrite = await vscode.window.showWarningMessage(
                        vscode.l10n.t('The file \'{0}\' already exists. Overwrite?', phpFileName),
                        { modal: true },
                        vscode.l10n.t('Overwrite')
                    );
                    if (overwrite !== vscode.l10n.t('Overwrite')) {
                        return;
                    }
                } catch (err) {
                    // File doesn't exist, which is good
                }
                
                // Create empty PHP file
                const emptyPhpContent = '<?php\n\n// ' + vscode.l10n.t('Empty PHP file created with PHP File Creator') + '\n';
                await vscode.workspace.fs.writeFile(filePath, Buffer.from(emptyPhpContent, 'utf8'));
                
                // Open the created file
                const document = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(document);
                
                vscode.window.showInformationMessage(vscode.l10n.t('Empty PHP file \'{0}\' has been created.', phpFileName));
            } catch (error) {
                vscode.window.showErrorMessage(vscode.l10n.t('Error creating PHP file: {0}', error instanceof Error ? error.message : String(error)));
            }
        });
        
        inputBox.show();
    }
}
