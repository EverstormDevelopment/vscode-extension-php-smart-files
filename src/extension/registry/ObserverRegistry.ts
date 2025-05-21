import { ConstructorType } from "../../container/type/ConstructorType";
import { DirectoryChangeObserver } from "../observer/DirectoryChangeObserver";
import { FileMovedObserver } from "../observer/FileMovedObserver";
import { FileRenamedObserver } from "../observer/FileRenamedObserver";

/**
 * Registry for all observers in the application that should
 * be started when the extension is activated.
 */
export const ObserverRegistry: Record<string, ConstructorType<any>> = {
    fileMovedObserver: FileMovedObserver,
    fileRenamedObserver: FileRenamedObserver,
    directoryChangeObserver: DirectoryChangeObserver,
};
