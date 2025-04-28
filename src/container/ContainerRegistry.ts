import { NewEmptyPhpClassCommand } from "../command/explorer/NewEmptyPhpClassCommand copy";
import { NewEmptyPhpFileCommand } from "../command/explorer/NewEmptyPhpFileCommand";
import { ContainerRegistrationType } from "./type/ContainerRegistrationType";

/**
 * Registry for all services in the application
 */
export const ContainerRegistry: ContainerRegistrationType[] = [
    {
        token: Symbol("newEmptyPhpFileCommand"),
        constructor: NewEmptyPhpFileCommand,
        dependencies: [],
    },
    {
        token: Symbol("newEmptyPhpClassCommand"),
        constructor: NewEmptyPhpClassCommand,
        dependencies: [],
    },
];
