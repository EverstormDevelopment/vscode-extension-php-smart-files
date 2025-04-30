import { NewEmptyPhpClassCommand } from "../command/explorer/NewEmptyPhpClassCommand";
import { NewEmptyPhpFileCommand } from "../command/explorer/NewEmptyPhpFileCommand";
import { ComposerJsonService } from "../service/composer/ComposerJsonService";
import { ComposerJsonFinder } from "../service/composer/model/ComposerJsonFinder";
import { ComposerJsonParser } from "../service/composer/model/ComposerJsonParser";
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
        constructor: ComposerJsonFinder,
        dependencies: [],
    },        
    {
        constructor: ComposerJsonParser,
        dependencies: [],
    },
    {
        constructor: ComposerJsonService,
        dependencies: [ComposerJsonFinder, ComposerJsonParser],
    },    
    {
        constructor: NewEmptyPhpFileCommand,
        dependencies: [UriFolderResolver, InputBoxFactory, FileCreator, ComposerJsonService],
    },
    {
        constructor: NewEmptyPhpClassCommand,
        dependencies: [UriFolderResolver, InputBoxFactory],
    },
];
