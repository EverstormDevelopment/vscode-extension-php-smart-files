import { NewEmptyPhpClassCommand } from "../command/explorer/NewEmptyPhpClassCommand";
import { NewEmptyPhpFileCommand } from "../command/explorer/NewEmptyPhpFileCommand";
import { ComposerJsonFinder } from "../service/composer/ComposerJsonFinder";
import { ComposerJsonParser } from "../service/composer/ComposerJsonParser";
import { ComposerJsonService } from "../service/composer/ComposerJsonService";
import { FileCreator } from "../service/file/creator/FileCreator";
import { FileGenerator } from "../service/file/generator/FileGenerator";
import { InputBoxFactory } from "../service/input/build/InputBoxFactory";
import { NamespaceResolver } from "../service/namespace/NamespaceResolver";
import { SnippetFactory } from "../service/snippet/build/SnippetFactory";
import { UriFolderResolver } from "../service/uri/UriFolderResolver";
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
        constructor: NamespaceResolver,
        dependencies: [ComposerJsonService],
    },
    {
        constructor: SnippetFactory,
        dependencies: [],
    },
    {
        constructor: FileGenerator,
        dependencies: [UriFolderResolver, InputBoxFactory, FileCreator, NamespaceResolver, SnippetFactory],
    },
    {
        constructor: NewEmptyPhpFileCommand,
        dependencies: [],
    },
    {
        constructor: NewEmptyPhpClassCommand,
        dependencies: [FileGenerator],
    },
];
