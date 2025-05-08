import { FileRenameOperationTypeEnum } from "../../service/filesystem/file/enum/FileRenameOperationTypeEnum";
import { NamespaceRefactorService } from "../../service/namespace/model/NamespaceRefactorService";
import { FileRenameObserverAbstract } from "./FileRenameObserverAbstract";

/**
 * Observer that handles file move operations in the workspace.
 * Updates namespaces and references when PHP files are moved.
 */
export class FileMovedObserver extends FileRenameObserverAbstract {
    /**
     * Constructor for the FileMovedObserver class.
     * @param namespaceRefactorService - The NamespaceRefactorService instance to be used for refactoring namespaces.
     */
    constructor(protected readonly namespaceRefactorService: NamespaceRefactorService) {
        super(
            namespaceRefactorService,
            FileRenameOperationTypeEnum.Moved,
            "refactorNamespacesOnFileMoved",
            'Would you like to update the namespace for "{0}" and all its references?'
        );
    }
}
