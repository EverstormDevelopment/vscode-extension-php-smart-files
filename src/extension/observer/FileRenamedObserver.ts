import { FilesystemOperationTypeEnum } from "../../service/filesystem/observer/enum/FilesystemOperationTypeEnum";
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
            FilesystemOperationTypeEnum.Renamed,
            "refactorNamespacesOnFileRenamed",
            'Would you like to update the declaration identifer to "{0}" and update its references?'
        );
    }
}
