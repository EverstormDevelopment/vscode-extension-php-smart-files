import { NewEmptyPhpClassCommand } from "../command/explorer/NewEmptyPhpClassCommand";
import { NewEmptyPhpFileCommand } from "../command/explorer/NewEmptyPhpFileCommand";
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
        constructor: NewEmptyPhpFileCommand,
        dependencies: [UriFolderResolver, InputBoxFactory],
    },
    {
        constructor: NewEmptyPhpClassCommand,
        dependencies: [UriFolderResolver, InputBoxFactory],
    },
];
