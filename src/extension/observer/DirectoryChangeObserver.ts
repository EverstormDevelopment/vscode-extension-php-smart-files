import * as vscode from "vscode";
import { FilesystemObserverResourceEnum } from "../../service/filesystem/observer/enum/FilesystemObserverResourceEnum";
import { FilesystemObserverEvent } from "../../service/filesystem/observer/event/FilesystemObserverEvent";
import { ObserverAbstract } from "./ObserverAbstract";

export class DirectoryChangeObserver extends ObserverAbstract {
    protected getConfigurationOptionName(): string {
        return "refactorNamespacesOnFileMoved";
    }

    protected async getConfirmationMessage(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<string> {
        // const name = getUriFileName(newUri);
        // return vscode.l10n.t("XXXXXXXXXXXXXXXXXXXXXXX?", name);
        return vscode.l10n.t("XXXXXXXXXXXXXXXXXXXXXXX?");
    }

    protected async isValidEvent(event: FilesystemObserverEvent): Promise<boolean> {
        return this.isDirectoryChangeEvent(event) && (await this.hasPhpFilesInDirectory(event.newUri));
    }

    protected async onRefactorAccepted(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const phpFiles = await this.getPhpFilesInDirectory(newUri);
        for (const newFileUri of phpFiles) {
            const oldPath = newFileUri.path.replace(newUri.path, oldUri.path);
            const oldFileUri = newFileUri.with({ path: oldPath });

            await this.namespaceRefactorService.refactorFileAndReferences(oldFileUri, newFileUri);
        }
    }

    private isDirectoryChangeEvent(event: FilesystemObserverEvent): boolean {
        return event.resource === FilesystemObserverResourceEnum.Directory;
    }

    protected async hasPhpFilesInDirectory(directoryUri: vscode.Uri): Promise<boolean> {
        const phpFiles = await this.getPhpFilesInDirectory(directoryUri, 1);
        return phpFiles.length > 0;
    }

    private async getPhpFilesInDirectory(directoryUri: vscode.Uri, limit?: number): Promise<vscode.Uri[]> {
        const globPattern = new vscode.RelativePattern(directoryUri.fsPath, "**/*.php");
        const phpFiles = await vscode.workspace.findFiles(globPattern, null, limit);

        return phpFiles;
    } 
}
