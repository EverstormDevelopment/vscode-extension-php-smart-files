import * as vscode from "vscode";
import { FilesystemObserverOperationEnum } from "../../service/filesystem/observer/enum/FilesystemObserverOperationEnum";
import { FilesystemObserverResourceEnum } from "../../service/filesystem/observer/enum/FilesystemObserverResourceEnum";
import { FilesystemObserverEvent } from "../../service/filesystem/observer/event/FilesystemObserverEvent";
import { getUriFileName } from "../../utils/filesystem/getUriFileName";
import { ObserverAbstract } from "./ObserverAbstract";

export class FileMovedObserver extends ObserverAbstract {
    protected getConfigurationOptionName(): string {
        return "refactorNamespacesOnFileMoved";
    }

    protected async getConfirmationMessage(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<string> {
        const name = getUriFileName(newUri);
        return vscode.l10n.t('Would you like to update the namespace for "{0}" and all its references?', name);
    }

    protected async isValidEvent(event: FilesystemObserverEvent): Promise<boolean> {
        return (
            event.resource === FilesystemObserverResourceEnum.File &&
            event.operation === FilesystemObserverOperationEnum.Moved
        );
    }

    protected async onRefactorAccepted(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        await this.namespaceRefactorService.refactorFileAndReferences(oldUri, newUri);
    }
}
