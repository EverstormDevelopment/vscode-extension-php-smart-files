import { NewEmptyPhpClassCommand } from "../command/explorer/NewEmptyPhpClassCommand";
import { NewEmptyPhpFileCommand, NewEmptyPhpFileCommandSymbol } from "../command/explorer/NewEmptyPhpFileCommand";
import { ContainerRegistrationType } from "./type/ContainerRegistrationType";

/**
 * Registry for all services in the application that should
 * be automatically registered in the container.
 */
export const ContainerRegistry: ContainerRegistrationType[] = [
    {
        key: NewEmptyPhpFileCommandSymbol,
        constructor: NewEmptyPhpFileCommand,
        dependencies: [],
    },
    {
        key: Symbol("newEmptyPhpClassCommand"),
        constructor: NewEmptyPhpClassCommand,
        dependencies: [],
    },
];
