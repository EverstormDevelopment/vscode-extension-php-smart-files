import * as vscode from "vscode";
import { getFileNameWithoutExtension } from "../../../utils/filesystem/getFileNameWithoutExtension";
import { NamespaceResolver } from "../../namespace/NamespaceResolver";
import { FileRenameOperationTypeEnum } from "../enum/FileRenameOperationTypeEnum";
import { FileRenameOperationEvent } from "../event/FileRenameOperationEvent";
import { FileRenameTracker } from "../model/FileRenameTracker";
import { NamespaceRefactorer } from "../model/NamespaceRefactorer";

export class FileMovedObserver {
    constructor(
        private readonly namespaceResolver: NamespaceResolver,
        private readonly fileRenameTracker = new FileRenameTracker()
    ) {}

    public start(context: vscode.ExtensionContext): void {
        this.fileRenameTracker.start(context);

        this.fileRenameTracker.onDidRenameFile(async (event: FileRenameOperationEvent) => {
            this.handleFileRenameOperationEvent(event);
        });
    }

    private async handleFileRenameOperationEvent(event: FileRenameOperationEvent): Promise<void> {
        if (event.operationType !== FileRenameOperationTypeEnum.Moved) {
            return;
        }

        this.handleFileMoved(event.oldUri, event.newUri);
    }

    private async handleFileMoved(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        this.handlePhpFileRename(oldUri, newUri);
    }

    private async handlePhpFileRename(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<void> {
        const oldNamespace = await this.namespaceResolver.resolve(oldUri);
        const newNamespace = await this.namespaceResolver.resolve(newUri);

        if (!oldNamespace || !newNamespace || oldNamespace === newNamespace) {
            return;
        }

        const filename = getFileNameWithoutExtension(oldUri);

        const foo = new NamespaceRefactorer();
        await foo.updateFileAndReferences(newUri, oldNamespace, newNamespace, filename);
    }
}
