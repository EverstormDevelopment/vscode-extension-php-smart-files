import * as vscode from 'vscode';
import { FileRenameOperationTypeEnum } from '../enum/FileRenameOperationTypeEnum';
import { FileRenameOperationEvent } from '../event/FileRenameOperationEvent';
import { FileRenameTracker } from '../model/FileRenameTracker';
import { isFile } from '../../../utils/filesystem/isFile';

export class FileMovedObserver {

    private readonly fileRenameTracker: FileRenameTracker;

    constructor() {
        this.fileRenameTracker = new FileRenameTracker();
    }

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
        console.log("isFile OLD", await isFile(oldUri));
        console.log("isFile NEW", await isFile(newUri));
    }
    
}