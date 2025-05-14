import { FilesystemOperationTypeEnum } from "../../service/filesystem/observer/enum/FilesystemOperationTypeEnum";
import { NamespaceRefactorService } from "../../service/namespace/model/NamespaceRefactorService";
import { FileRenameObserverAbstract } from "./FileRenameObserverAbstract";

export class FileRenamedObserver extends FileRenameObserverAbstract {
    /**
     * Constructor for the FileRenamedObserver class.
     * @param namespaceRefactorService - The NamespaceRefactorService instance to be used for refactoring namespaces.
     */
    constructor(protected readonly namespaceRefactorService: NamespaceRefactorService) {
        super(
            namespaceRefactorService,
            FilesystemOperationTypeEnum.Renamed,
            "refactorNamespacesOnFileRenamed",
            'Would you like to update the declaration identifer to "{0}" and update its references?'
        );
    }
}
