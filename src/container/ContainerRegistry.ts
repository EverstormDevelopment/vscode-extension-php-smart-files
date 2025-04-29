import { NewEmptyPhpClassCommand } from "../command/explorer/NewEmptyPhpClassCommand";
import { NewEmptyPhpFileCommand } from "../command/explorer/NewEmptyPhpFileCommand";
import { UriFolderResolver } from "../service/filesystem/UriFolderResolver";
import { ContainerRegistrationType } from "./type/ContainerRegistrationType";

/**
 * Registry for all services in the application that should
 * be automatically registered in the container.
 */
export const ContainerRegistry: ContainerRegistrationType[] = [
    {
        constructor: UriFolderResolver,
        dependencies: [],
    },
    {
        constructor: NewEmptyPhpFileCommand,
        dependencies: [UriFolderResolver],
    },
    {
        constructor: NewEmptyPhpClassCommand,
        dependencies: [UriFolderResolver],
    },
];
