import { NewEmptyPhpClassCommand } from "../command/explorer/NewEmptyPhpClassCommand";
import { NewEmptyPhpFileCommand } from "../command/explorer/NewEmptyPhpFileCommand";
import { FileCreator } from "../service/filesystem/FileCreator";
import { UriFolderResolver } from "../service/filesystem/UriFolderResolver";
import { InputBoxFactory } from "../service/input/build/InputBoxFactory";
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
        constructor: InputBoxFactory,
        dependencies: [],
    },
    {
        constructor: FileCreator,
        dependencies: [],
    },
    {
        constructor: NewEmptyPhpFileCommand,
        dependencies: [UriFolderResolver, InputBoxFactory, FileCreator],
    },
    {
        constructor: NewEmptyPhpClassCommand,
        dependencies: [UriFolderResolver, InputBoxFactory],
    },
];
