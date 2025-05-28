import { FileGenerationCommand } from "../../extension/command/FileGenerationCommand";
import { DirectoryChangeObserver } from "../../extension/observer/DirectoryChangeObserver";
import { FileMovedObserver } from "../../extension/observer/FileMovedObserver";
import { FileRenamedObserver } from "../../extension/observer/FileRenamedObserver";
import { ComposerJsonFinder } from "../../service/composer/model/ComposerJsonFinder";
import { ComposerJsonParser } from "../../service/composer/model/ComposerJsonParser";
import { ComposerJsonService } from "../../service/composer/model/ComposerJsonService";
import { FileCreator } from "../../service/filesystem/file/model/FileCreator";
import { FilesystemObserver } from "../../service/filesystem/observer/model/FilesystemObserver";
import { UriFolderResolver } from "../../service/filesystem/uri/UriFolderResolver";
import { InputBoxFactory } from "../../service/input/build/InputBoxFactory";
import { NamespaceDirectoryRefactorer } from "../../service/namespace/component/NamespaceDirectoryRefactorer";
import { NamespaceFileRefactorer } from "../../service/namespace/component/NamespaceFileRefactorer";
import { NamespaceReferencesRefactorer } from "../../service/namespace/component/NamespaceReferencesRefactorer";
import { NamespaceResolver } from "../../service/namespace/component/NamespaceResolver";
import { NamespaceSourceRefactorer } from "../../service/namespace/component/NamespaceSourceRefactorer";
import { NamespaceRefactorDetailsProvider } from "../../service/namespace/provider/NamespaceRefactorDetailsProvider";
import { NamespaceRegExpProvider } from "../../service/namespace/provider/NamespaceRegExpProvider";
import { NamespaceRefactorService } from "../../service/namespace/service/NamespaceRefactorService";
import { NamespaceIdentifierValidator } from "../../service/namespace/validator/NamespaceIdentifierValidator";
import { SnippetFactory } from "../../service/snippet/build/SnippetFactory";
import { ContainerRegistrationType } from "../type/ContainerRegistrationType";
import { NamespacePathValidator } from "./../../service/namespace/validator/NamespacePathValidator";

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
        constructor: ComposerJsonService,
        dependencies: [ComposerJsonFinder, ComposerJsonParser],
    },
    {
        constructor: SnippetFactory,
        dependencies: [],
    },
    {
        constructor: NamespaceRegExpProvider,
        dependencies: [],
    },
    {
        constructor: NamespacePathValidator,
        dependencies: [NamespaceRegExpProvider],
    },
    {
        constructor: NamespaceIdentifierValidator,
        dependencies: [NamespaceRegExpProvider],
    },
    {
        constructor: NamespaceResolver,
        dependencies: [ComposerJsonService, NamespacePathValidator],
    },
    {
        constructor: FileGenerationCommand,
        dependencies: [UriFolderResolver, InputBoxFactory, FileCreator, NamespaceResolver, SnippetFactory],
    },
    {
        constructor: NamespaceRefactorDetailsProvider,
        dependencies: [
            NamespaceResolver,
            NamespaceRegExpProvider,
            NamespacePathValidator,
            NamespaceIdentifierValidator,
        ],
    },
    {
        constructor: NamespaceSourceRefactorer,
        dependencies: [NamespaceRegExpProvider],
    },
    {
        constructor: NamespaceReferencesRefactorer,
        dependencies: [NamespaceRegExpProvider],
    },
    {
        constructor: NamespaceFileRefactorer,
        dependencies: [NamespaceSourceRefactorer, NamespaceReferencesRefactorer],
    },
    {
        constructor: NamespaceDirectoryRefactorer,
        dependencies: [NamespaceRefactorDetailsProvider, NamespaceFileRefactorer],
    },
    {
        constructor: NamespaceRefactorService,
        dependencies: [NamespaceRefactorDetailsProvider, NamespaceFileRefactorer, NamespaceDirectoryRefactorer],
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
    {
        constructor: DirectoryChangeObserver,
        dependencies: [FilesystemObserver, NamespaceRefactorService],
    },
];
