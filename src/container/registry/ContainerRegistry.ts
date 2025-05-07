import { FileGenerationCommand } from "../../extension/command/FileGenerationCommand";
import { ComposerJsonFinder } from "../../service/composer/model/ComposerJsonFinder";
import { ComposerJsonParser } from "../../service/composer/model/ComposerJsonParser";
import { ComposerJsonService } from "../../service/composer/model/ComposerJsonService";
import { FileCreator } from "../../service/filesystem/file/FileCreator";
import { UriFolderResolver } from "../../service/filesystem/uri/UriFolderResolver";
import { InputBoxFactory } from "../../service/input/build/InputBoxFactory";
import { NamespaceResolver } from "../../service/namespace/NamespaceResolver";
import { NamespaceRefactorer } from "../../service/refactor/model/NamespaceRefactorer";
import { FileMovedObserver } from "../../service/refactor/observer/FileMovedObserver";
import { SnippetFactory } from "../../service/snippet/build/SnippetFactory";
import { ContainerRegistrationType } from "../type/ContainerRegistrationType";

/**
 * Registry for all services in the application that should
 * be automatically registered in the dependency injection container.
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
        constructor: SnippetFactory,
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
        constructor: FileGenerationCommand,
        dependencies: [UriFolderResolver, InputBoxFactory, FileCreator, NamespaceResolver, SnippetFactory],
    },

    {
        constructor: NamespaceRefactorer,
        dependencies: [NamespaceResolver],
    },
    {
        constructor: FileMovedObserver,
        dependencies: [NamespaceRefactorer],
    },
];
