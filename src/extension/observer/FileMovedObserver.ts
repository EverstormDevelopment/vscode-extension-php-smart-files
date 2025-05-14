import { FilesystemOperationTypeEnum } from "../../service/filesystem/observer/enum/FilesystemOperationTypeEnum";
import { FilesystemObserver } from "../../service/filesystem/observer/model/FilesystemObserver";
import { NamespaceRefactorService } from "../../service/namespace/model/NamespaceRefactorService";
import { FileRenameObserverAbstract } from "./FileRenameObserverAbstract";

/**
 * Observer that handles file move operations in the workspace.
 * Updates namespaces and references when PHP files are moved.
 */
export class FileMovedObserver extends FileRenameObserverAbstract {
    constructor(
        protected readonly filesystemObserver: FilesystemObserver,
        protected readonly namespaceRefactorService: NamespaceRefactorService
    ) {
        super(
            filesystemObserver,
            namespaceRefactorService,
            FilesystemOperationTypeEnum.Moved,
            "refactorNamespacesOnFileMoved",
            'Would you like to update the namespace for "{0}" and all its references?'
        );
    }
}
