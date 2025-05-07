import { ConstructorType } from "../../container/type/ConstructorType";
import { NamespaceFileMovedObserver } from "../../service/namespace/observer/NamespaceFileMovedObserver";

/**
 * Registry for all file observers in the application that should
 * be started when the extension is activated.
 */
export const FileObserverRegistry: Record<string, ConstructorType<any>> = {
    namespaceFileMovedObserver: NamespaceFileMovedObserver,
};
