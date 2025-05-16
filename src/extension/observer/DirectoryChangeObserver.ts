import * as vscode from "vscode";
import { FilesystemObserverResourceEnum } from "../../service/filesystem/observer/enum/FilesystemObserverResourceEnum";
import { FilesystemObserverEvent } from "../../service/filesystem/observer/event/FilesystemObserverEvent";
import { hasFilesInUriDirectory } from "../../utils/filesystem/hasFilesInUriDirectory";
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
        this.namespaceRefactorService.refactorDirectoryAndReferences(oldUri, newUri);
    }

    private isDirectoryChangeEvent(event: FilesystemObserverEvent): boolean {
        return event.resource === FilesystemObserverResourceEnum.Directory;
    }

    protected async hasPhpFilesInDirectory(directoryUri: vscode.Uri): Promise<boolean> {
        return await hasFilesInUriDirectory(directoryUri, "**/*.php");
    }
}
