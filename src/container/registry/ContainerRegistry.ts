import { FileGenerationCommand } from "../../extension/command/FileGenerationCommand";
import { FileMovedObserver } from "../../extension/observer/FileMovedObserver";
import { FileRenamedObserver } from "../../extension/observer/FileRenamedObserver";
import { ComposerJsonFinder } from "../../service/composer/model/ComposerJsonFinder";
import { ComposerJsonParser } from "../../service/composer/model/ComposerJsonParser";
import { ComposerJsonService } from "../../service/composer/model/ComposerJsonService";
import { FileCreator } from "../../service/filesystem/file/model/FileCreator";
import { FilesystemObserver } from "../../service/filesystem/observer/model/FilesystemObserver";
import { UriFolderResolver } from "../../service/filesystem/uri/UriFolderResolver";
import { InputBoxFactory } from "../../service/input/build/InputBoxFactory";
import { NamespaceFileRefactorer } from "../../service/namespace/model/NamespaceFileRefactorer";
import { NamespaceRefactorService } from "../../service/namespace/model/NamespaceRefactorService";
import { NamespaceReferencesRefactorer } from "../../service/namespace/model/NamespaceReferencesRefactorer";
import { NamespaceResolver } from "../../service/namespace/model/NamespaceResolver";
import { NamespaceRefactorDetailsProvider } from "../../service/namespace/provider/NamespaceRefactorDetailsProvider";
import { NamespaceRegExpProvider } from "../../service/namespace/provider/NamespaceRegExpProvider";
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
        constructor: NamespaceRegExpProvider,
        dependencies: [],
    },
    {
        constructor: NamespaceRefactorDetailsProvider,
        dependencies: [NamespaceResolver, NamespaceRegExpProvider],
    },    
    {
        constructor: NamespaceFileRefactorer,
        dependencies: [NamespaceRegExpProvider],
    },
    {
        constructor: NamespaceReferencesRefactorer,
        dependencies: [NamespaceRegExpProvider],
    },
    {
        constructor: NamespaceRefactorService,
        dependencies: [NamespaceRefactorDetailsProvider, NamespaceFileRefactorer, NamespaceReferencesRefactorer],
    },
    {
        constructor: FilesystemObserver,
        dependencies: [],
    },
    {
        constructor: FileMovedObserver,
        dependencies: [FilesystemObserver, NamespaceRefactorService],
    },
    {
        constructor: FileRenamedObserver,
        dependencies: [FilesystemObserver, NamespaceRefactorService],
    },
];
