// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * This method is called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "php-file-creator" is now active!');

	/**
	 * Register new command for creating an empty PHP file
	 */
	const newEmptyPhpFileCommand = vscode.commands.registerCommand('php-file-creator.newEmptyPhpFile', async (uri: vscode.Uri) => {
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
	});

	/**
	 * Register new command for creating a PHP class
	 */
	const newPhpClassCommand = vscode.commands.registerCommand('php-file-creator.newPhpClass', async (uri: vscode.Uri) => {
		// Determine the target folder based on context
		const targetFolder = getTargetFolderFromContext(uri);
		if (!targetFolder) {
			vscode.window.showErrorMessage(vscode.l10n.t('No target folder selected or no workspace opened.'));
			return;
		}
		
		// Create VS Code-like dialog
		const inputBox = vscode.window.createInputBox();
		inputBox.title = vscode.l10n.t('Create new PHP class');
		inputBox.placeholder = vscode.l10n.t('Enter class name');
		inputBox.prompt = vscode.l10n.t('Enter a name for the new PHP class');
		
		inputBox.onDidChangeValue(value => {
			// Live validation of class name
			if (!value || value.length === 0) {
				inputBox.validationMessage = vscode.l10n.t('Please enter a class name');
			} else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
				inputBox.validationMessage = vscode.l10n.t('Class name must start with a letter and can only contain letters, numbers and underscores');
			} else {
				inputBox.validationMessage = undefined;
			}
		});
		
		inputBox.onDidAccept(async () => {
			const className = inputBox.value;
			if (!className || className.length === 0 || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(className)) {
				return;
			}
			
			inputBox.hide();
			
			// Create path for the new file
			const phpFileName = `${className}.php`;
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
				
				// Create PHP class template
				const classTemplate = `<?php

/**
 * Class ${className}
 * 
 * ${vscode.l10n.t('Created with PHP File Creator')}
 */
class ${className} {
    /**
     * Constructor
     */
    public function __construct() {
        // ${vscode.l10n.t('Initialize here')}
    }
    
    // ${vscode.l10n.t('Add methods here')}
}
`;
				await vscode.workspace.fs.writeFile(filePath, Buffer.from(classTemplate, 'utf8'));
				
				// Open the created file
				const document = await vscode.workspace.openTextDocument(filePath);
				await vscode.window.showTextDocument(document);
				
				vscode.window.showInformationMessage(vscode.l10n.t('PHP class \'{0}\' has been created.', className));
			} catch (error) {
				vscode.window.showErrorMessage(vscode.l10n.t('Error creating PHP class file: {0}', error instanceof Error ? error.message : String(error)));
			}
		});
		
		inputBox.show();
	});

	/**
	 * Helper function to determine the target folder
	 */
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

	// Add all commands to context subscriptions
	context.subscriptions.push(newEmptyPhpFileCommand);
	context.subscriptions.push(newPhpClassCommand);
}

/**
 * This method is called when the extension is deactivated
 */
export function deactivate() {}
