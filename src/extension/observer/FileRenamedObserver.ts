import { FilesystemObserverOperationEnum } from "../../service/filesystem/observer/enum/FilesystemObserverOperationEnum";
import { FilesystemObserver } from "../../service/filesystem/observer/model/FilesystemObserver";
import { NamespaceRefactorService } from "../../service/namespace/model/NamespaceRefactorService";
import { FileRenameObserverAbstract } from "./FileRenameObserverAbstract";

export class FileRenamedObserver extends FileRenameObserverAbstract {
    constructor(
        protected readonly filesystemObserver: FilesystemObserver,
        protected readonly namespaceRefactorService: NamespaceRefactorService
    ) {
        super(
            filesystemObserver,
            namespaceRefactorService,
            FilesystemObserverOperationEnum.Renamed,
            "refactorNamespacesOnFileRenamed",
            'Would you like to update the declaration identifer to "{0}" and update its references?'
        );
    }
}
