import { ConstructorType } from "../../container/type/ConstructorType";
import { FileMovedObserver } from "../observer/FileMovedObserver";
import { FileRenamedObserver } from "../observer/FileRenamedObserver";


/**
 * Registry for all file observers in the application that should
 * be started when the extension is activated.
 */
export const FileObserverRegistry: Record<string, ConstructorType<any>> = {
    namespaceFileMovedObserver: FileMovedObserver,
    namespaceFileRenamedObserver: FileRenamedObserver,
};
