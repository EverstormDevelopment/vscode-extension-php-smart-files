# AGENTS.md

This file gives coding agents the current working rules and architecture notes for this repository.

## Language Rules

- All code artifacts must be in English: variable names, function names, class names, comments, JSDoc, commit messages, error messages in code, type names, and file names.
- Communication with the user follows the user's language.

## Project Overview

PHP Smart Files is a VS Code extension for PHP projects.

Current scope:
- Create PHP files from the explorer context menu.
- Generate empty and template-based files for classes, interfaces, traits, enums, functions, and Symfony-specific templates.
- Resolve namespaces from `composer.json` autoload rules (`psr-4` and `psr-0`), with optional fallback namespace support.
- Refactor namespaces, declarations, `use` statements, and workspace references when PHP files or directories are renamed or moved.
- Localize user-facing strings with `@vscode/l10n`.

## Build and Dev

```bash
npm install
npm run watch
npm run package
npm run compile-tests
npm run watch-tests
npm run lint
npm run l10n-extract
npm run l10n-pseudo
npm test
```

Notes:
- Bundling uses Webpack 5 with `ts-loader`.
- Production output is `dist/extension.js`.
- Tests are compiled into `out/` with `tsc -p . --outDir out`.
- `npm test` runs `pretest` first: compile tests, compile extension, then lint.
- The VS Code test entry is configured in `.vscode-test.mjs`.

## Working Rules

- Read `package.json` before changing commands, settings, activation behavior, menus, or commands.
- Read `src/container/registry/ContainerRegistry.ts` before adding new DI-managed services.
- Preserve localization. New user-facing strings should use `vscode.l10n.t()`.
- Keep edits aligned with strict TypeScript and the repository's JSDoc style.
- Do not reintroduce removed concepts such as `GlobalReservedService`; reserved-name handling is currently centered around the static keyword list under `src/service/php/reserved/ReservedKeywords.ts`.

## Architecture

### Main Structure

```text
src/
  extension.ts
  container/
  extension/
  service/
  utils/
```

Important areas:
- `src/extension/`: activation, commands, observers, registries
- `src/container/`: lightweight DI container
- `src/service/composer/`: Composer lookup and parsing
- `src/service/filesystem/`: file operations and rename/move observation
- `src/service/namespace/`: namespace resolution and refactoring
- `src/service/php/`: PHP enums, helpers, reserved names
- `src/service/snippet/`: snippet factories for generated files

### Activation and Observers

- `src/extension.ts` is the VS Code entry point.
- `src/extension/model/Extension.ts` handles activation.
- File creation commands are registered immediately.
- Refactor observers are registered lazily once the workspace contains a PHP file.
- Lazy bootstrapping uses a file watcher for `**/*.php`, but actual move and rename processing is driven by `vscode.workspace.onDidRenameFiles`.

### Dependency Injection

The project uses a lightweight custom DI container:
- `ContainerFactory` creates the default container.
- `Container` resolves dependencies lazily.
- `ContainerRegistry` is the authoritative service registration list.

Important:
- `PhpParser` and `PhpAstTraverser` are intentionally instantiated with `new` per parse and are not registered in the container.

### File Creation Flow

File creation commands are defined in `src/extension/registry/FileGenerationCommandRegistry.ts`.

Current file types:
- Empty file
- Empty function
- Empty class
- Empty interface
- Empty trait
- Empty enum
- Template function
- Template class
- Template interface
- Template trait
- Template enum
- Symfony controller
- Symfony command
- Symfony form

`FileGenerationCommand` combines:
- target URI resolution
- input handling and validation
- namespace resolution
- snippet generation
- file creation

### Namespace Refactoring Flow

Current event flow:

```text
VS Code rename event: onDidRenameFiles
  -> FilesystemObserver
    -> FileMovedObserver / FileRenamedObserver / DirectoryChangeObserver
      -> NamespaceRefactorService
        -> NamespaceRefactorDetailsProvider
        -> NamespaceFileRefactorer or NamespaceDirectoryRefactorer
```

Responsibilities:
- `FilesystemObserver` classifies rename events as file or directory, and as renamed vs moved.
- `FileMovedObserver` handles PHP file moves.
- `FileRenamedObserver` handles PHP file renames and guards against reserved PHP keywords.
- `DirectoryChangeObserver` handles directory rename or move operations when PHP files exist inside.
- `NamespaceRefactorService` validates refactorability and orchestrates file vs directory refactors.
- `NamespaceRefactorDetailsProvider` gathers old/new namespace and identifier details from file content and file paths.
- `NamespaceFileRefactorer` updates the moved file plus external references.
- `NamespaceDirectoryRefactorer` iterates PHP files in a moved or renamed directory.

### Namespace Resolution

`NamespaceResolver` currently works as follows:
- First try Composer autoload resolution using the nearest matching `composer.json`.
- Support both `psr-4` and `psr-0`.
- Choose the most specific matching configured directory.
- If Composer resolution fails, optionally use the configured fallback namespace.
- Fallback resolution is relative to the workspace folder.

Related settings:
- `phpSmartFiles.useFallbackNamespace`
- `phpSmartFiles.fallbackNamespace`

## AST and Parser Notes

Namespace refactoring is AST-based. That implementation detail is still relevant when editing parser or refactor code, but the migration history is not.

Keep these practical gotchas in mind:
- The parser is instantiated with `php7: true` and `withPositions: true`.
- `usegroup.items` exists at runtime even if typings suggest a different property.
- For grouped imports, item names must be combined with the group prefix.
- FQN name nodes include the leading backslash in both `name` and `loc.start.offset`.
- For some standalone expression statements, `loc.end.offset` can include the trailing semicolon, so replacements should use `start + name.length`.
- Attribute names are plain strings, not nested `name` nodes.

## Settings That Matter

Current contributed settings in `package.json`:
- `phpSmartFiles.useStrictTypeInTemplates`
- `phpSmartFiles.useFallbackNamespace`
- `phpSmartFiles.fallbackNamespace`
- `phpSmartFiles.refactorNamespacesOnFileMoved`
- `phpSmartFiles.refactorNamespacesOnFileRenamed`
- `phpSmartFiles.refactorNamespacesOnDirectoryChanges`
- `phpSmartFiles.refactorNamespacesSortUseStatements`
- `phpSmartFiles.refactorNamespacesIncludeFunctions`
- `phpSmartFiles.refactorNamespacesIncludeConstants`
- `phpSmartFiles.refactorNamespacesExcludeDirectories`

Important:
- The correct sort setting name is `phpSmartFiles.refactorNamespacesSortUseStatements`.
- When changing settings, update `package.json`, localization strings, and code paths that read them.

## Reserved Names

There is no current `GlobalReservedService`.

Reserved-name handling is currently centered around:
- `src/service/php/reserved/ReservedKeywords.ts`

Current behavior:
- File rename validation checks `ReservedKeywords` to warn when the new filename maps to a reserved PHP keyword.
- Input validation and PHPDoc type parsing also use `ReservedKeywords` to avoid invalid PHP identifiers and built-in pseudo-types.

## Conventions

- TypeScript strict mode is enabled.
- Prefer interfaces for public contracts between services.
- Use abstract classes where shared refactor behavior is substantial.
- Use enums for PHP/file/refactor kinds.
- Use type aliases for plain DTO-style data objects.
- Keep constructor injection as `private readonly` or `protected readonly`.
- Use `async/await` for I/O.
- Keep import ordering consistent: external imports first, then internal imports.
- Follow the established JSDoc style on public and protected methods.
- Use string literal AST node kinds where the codebase already does so, for example `case "constantstatement":`.

## Verification Guidance

When changing namespace refactoring or parser behavior, prioritize:
- `npm run lint`
- `npm run compile-tests`
- `npm test`

When changing only documentation or metadata, full test execution is usually unnecessary unless behavior was also touched.

## Key Files

- `src/extension.ts`
- `src/extension/model/Extension.ts`
- `src/extension/registry/FileGenerationCommandRegistry.ts`
- `src/extension/registry/ObserverRegistry.ts`
- `src/container/registry/ContainerRegistry.ts`
- `src/service/filesystem/observer/model/FilesystemObserver.ts`
- `src/service/namespace/parser/PhpParser.ts`
- `src/service/namespace/parser/PhpAstTraverser.ts`
- `src/service/namespace/provider/NamespaceRefactorDetailsProvider.ts`
- `src/service/namespace/resolver/NamespaceResolver.ts`
- `src/service/namespace/abstract/NamespaceRefactorerAbstract.ts`
- `src/service/namespace/component/NamespaceSourceRefactorer.ts`
- `src/service/namespace/component/NamespaceReferencesRefactorer.ts`
- `src/service/snippet/build/SnippetFactory.ts`
- `package.json`
