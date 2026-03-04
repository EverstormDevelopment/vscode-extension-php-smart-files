# PHP Smart Files – CLAUDE.md

## Language Rules

- **All code artifacts must be in English**: variable names, function names, class names, comments, JSDoc, commit messages, error messages in code, type names, file names.
- **Communication with the user** (chat responses) follows the user's language.

---

## Project Overview

**PHP Smart Files** is a VS Code extension (TypeScript, v1.1.0) for PHP developers. It provides:

- **File creation**: Create PHP classes, interfaces, traits, enums, functions, and framework templates (Symfony Controller/Command/Form) via context menu, with automatically resolved PSR-4 namespaces.
- **Namespace refactoring**: When PHP files or directories are moved/renamed, namespace declarations, `use` statements, and all references across the workspace are automatically updated.
- **Smart namespace resolution**: Namespace is resolved from `composer.json` (PSR-0/PSR-4 autoload); optional fallback namespace configurable.
- **Localization**: l10n via `@vscode/l10n` (DE, EN, ES, FR, RU).

---

## Build & Dev

```bash
npm install          # install dependencies
npm run watch        # development build (watch mode)
npm run package      # production build (for publishing)
npm test             # run tests
npm run lint         # run ESLint
npm run l10n-extract # extract l10n strings
```

- **Bundler**: Webpack 5, TypeScript 5 via `ts-loader`
- **Output**: `dist/extension.js` (bundled; only `php-parser` is an external runtime dependency)
- **Tests**: `@vscode/test-cli` + Mocha, entry: `src/test/extension.test.ts`
- **Lint**: ESLint with `@typescript-eslint`

---

## Architecture

### Dependency Injection Container

A lightweight custom DI container (`src/container/`):

- `ContainerFactory` – singleton factory for the default container
- `ContainerRegistry` – list of all registered services with their dependencies
- `Container` – resolves dependencies lazily

All services are registered in `src/container/registry/ContainerRegistry.ts`. New services must be added there.

### Directory Structure

```
src/
├── extension.ts                  # VS Code entry point (activate/deactivate)
├── container/                    # DI container
│   ├── build/ContainerFactory.ts
│   ├── model/Container.ts
│   └── registry/ContainerRegistry.ts
├── extension/
│   ├── model/Extension.ts        # Main lifecycle class
│   ├── command/FileGenerationCommand.ts
│   ├── observer/                 # FileMovedObserver, FileRenamedObserver, DirectoryChangeObserver
│   └── registry/                 # Command and observer registries
└── service/
    ├── composer/                 # Read and parse composer.json
    ├── filesystem/               # File operations, URI utilities, FilesystemObserver
    ├── input/                    # InputBox builder, validators, processors
    ├── namespace/                # Core: namespace resolution and refactoring
    ├── php/                      # PHP reserved names, FileTypeEnum
    ├── snippet/                  # Code snippets for all PHP types
    └── utils/                    # filesystem, regexp, string, vscode utilities
```

### Core Services in `namespace/`

| Service | Responsibility |
|---|---|
| `PhpParser` | Wraps `php-parser` (npm); provides AST, extracts namespace and top-level identifiers |
| `NamespaceResolver` | Resolves namespace from `composer.json` (PSR-0/PSR-4) or fallback |
| `NamespaceRefactorDetailsProvider` | Collects all details (old/new URI, namespace, identifiers) for a refactoring operation |
| `NamespaceSourceRefactorer` | Updates namespace, definition, `use` statements and partially qualified references **in the moved file** |
| `NamespaceReferencesRefactorer` | Updates all references to the class **across the workspace** (parallel) |
| `NamespaceFileRefactorer` | Orchestrates source + reference refactoring for a single file |
| `NamespaceDirectoryRefactorer` | Iterates all PHP files in a directory and calls FileRefactorer |
| `NamespaceRefactorService` | Public entry point; decides whether a file or directory is refactored |
| `NamespaceRegExpProvider` | Provides all regex patterns for PHP namespace operations |

### Observer Flow

```
VS Code event (onWillRenameFiles / onWillCreateFiles / Watcher)
  └─> FileMovedObserver / FileRenamedObserver / DirectoryChangeObserver
        └─> NamespaceRefactorService.refactorFile() / refactorDirectory()
              └─> NamespaceRefactorDetailsProvider.get()
                    ├─> PhpParser (AST) → namespace + identifiers
                    └─> NamespaceResolver (composer.json) → new namespace
              └─> NamespaceFileRefactorer.refactor()
                    ├─> NamespaceSourceRefactorer  (update source file)
                    └─> NamespaceReferencesRefactorer (update workspace references)
```

---

## Current State: Regex vs. AST

### What is already AST-based

`PhpParser` (`src/service/namespace/parser/PhpParser.ts`) already uses `php-parser@^3.2.3` as a full PHP AST parser. It is used **only** in `NamespaceRefactorDetailsProvider.getContentDetails()` to read the namespace and top-level identifiers (class/interface/trait/enum/function/const) from the **moved file** itself.

### What is still regex-based

The entire **content refactoring layer** still operates on regex via `NamespaceRegExpProvider`:

| Regex method | Usage |
|---|---|
| `getNamespaceDeclarationRegExp()` | Find and replace the namespace declaration |
| `getDefinitionRegExp()` | Find and replace the class/interface/enum/trait definition |
| `getFullyQualifiedNamespaceRegExp()` | Replace fully qualified references (`\A\B\C`) |
| `getNonQualifiedOopReferenceRegExp()` | Find unqualified OOP references (extends, implements, new, use, type hints) |
| `getNonQualifiedFunctionReferenceRegExp()` | Find unqualified function calls |
| `getNonQualifiedConstantReferenceRegExp()` | Find unqualified constant references |
| `getPartiallyQualifiedReferenceRegExp()` | Find partially qualified references (`Sub\Class`) |
| `getUseStatementRegExp()` | Find, replace, or add `use` statements |
| `getUseStatementBlockRegExp()` | Extract a `use` block for sorting |
| `getLastUseStatementRegExp()` | Find the last `use` statement for insertion position |

### Known regex limitations

- **Grouped use statements** (`use Namespace\{ClassA, ClassB}`) are not handled correctly (see `.github/FR.md`)
- Regex cannot reliably exclude PHP code inside strings or comments
- Complex lookbehind/lookahead chains are hard to maintain and error-prone

---

## Planned Migration: Regex → AST

### Goal

Migrate the entire refactoring layer (`NamespaceSourceRefactorer`, `NamespaceReferencesRefactorer`, `NamespaceRefactorerAbstract`) to full AST-based analysis. `php-parser` is already installed.

### Strategy

**Phase 1 – AST for read access (analysis)**

Replace all regex used for _finding_ references with AST traversal:
- `getNonQualifiedOopReferenceRegExp()` → AST node traversal for `use`, `new`, `extends`, `implements`, type hints
- `getNonQualifiedFunctionReferenceRegExp()` → AST traversal for function calls
- `getNonQualifiedConstantReferenceRegExp()` → AST traversal for constant references
- `getPartiallyQualifiedReferenceRegExp()` → AST traversal for partially qualified names

**Phase 2 – AST for write access (manipulation)**

Apply name/namespace changes via AST node positions + targeted string replacements:
- `php-parser` supports `withPositions: true` → use `loc` positions for precise replacements
- Alternative: `php-parser` printer / code generator approach

**Phase 3 – Remove `NamespaceRegExpProvider`**

Once Phase 1+2 are complete, `NamespaceRegExpProvider` can be removed. Simple validation regex (e.g. `getNamespacePatternRegExp()`, `getIdentifierPatternRegExp()`) may remain.

### Recommended approach

1. Extend `PhpParser` with a `getUseStatements()` method returning all `use` statements as structured objects.
2. Introduce a `PhpAstTraverser` class that traverses the AST and collects references by type.
3. Replace individual regex methods with AST alternatives one by one – start with the most critical (`getNonQualifiedOopReferenceRegExp`).
4. Rewrite `NamespaceSourceRefactorer`: instead of regex string-replace, use AST positions for targeted substring replacements.
5. **Grouped use statements** should be implemented after the AST migration – trivial once on AST.

### `php-parser` library reference

- Package: `php-parser@^3.2.3` (already installed)
- Import: `import { Engine } from "php-parser"`
- Current config in `PhpParser.ts`: `php7: true`, `suppressErrors: true`, `withPositions: true`
- All nodes have `loc` positions (line/column) when `withPositions: true`
- Relevant node kinds: `namespace`, `useitem`, `class`, `interface`, `trait`, `enum`, `function`, `constantstatement`, `call`, `new`, `identifier`, `name`

---

## Settings (`package.json` contributes)

| Setting | Default | Description |
|---|---|---|
| `phpSmartFiles.useStrictTypeInTemplates` | `false` | Add `declare(strict_types=1)` in templates |
| `phpSmartFiles.useFallbackNamespace` | `false` | Enable fallback namespace |
| `phpSmartFiles.fallbackNamespace` | `"App"` | Fallback namespace value |
| `phpSmartFiles.refactorNamespacesOnFileMoved` | `"confirm"` | confirm / always / never |
| `phpSmartFiles.refactorNamespacesOnFileRenamed` | `"confirm"` | confirm / always / never |
| `phpSmartFiles.refactorNamespacesOnDirectoryChanges` | `"confirm"` | confirm / always / never |
| `phpSmartFiles.refactorNamespacesSortUseStatements` | `true` | Sort `use` statements after refactoring |
| `phpSmartFiles.refactorNamespacesIncludeFunctions` | `true` | Include functions in refactoring |
| `phpSmartFiles.refactorNamespacesIncludeConstants` | `true` | Include constants in refactoring |
| `phpSmartFiles.refactorNamespacesExcludeDirectories` | (vendor, node_modules, …) | Excluded directory patterns |

---

## Snippet System

`src/service/snippet/build/` contains factory classes for all PHP types:

- `SnippetFactory` – main dispatcher, selects factory by `FileTypeEnum`
- `SnippetClassFactory`, `SnippetInterfaceFactory`, `SnippetTraitFactory`, `SnippetEnumFactory`, `SnippetFunctionFactory`, `SnippetFileFactory`
- `SnippetTemplateClassFactory`, etc. – template variants (with constructor, method scaffolding)
- `SnippetSymfonyCommandFactory`, `SnippetSymfonyControllerFactory`, `SnippetSymfonyFormFactory` – framework templates

---

## GlobalReservedService

Prevents PHP-internal functions/constants from being incorrectly added as `use` statements during refactoring.

- Combines static lists (PHP keywords, global functions/constants, framework-specific lists)
- Dynamically queries all available functions/constants from the real PHP runtime via `php -r "..."`
- Fallback: framework detection based on `composer.json` dependencies
- Reloaded on `composer.json`/`composer.lock` changes and PHP path changes

---

## Conventions

- **TypeScript strict mode** (tsconfig)
- **Interfaces** for all external dependencies: `ContainerInterface`, `FilesystemObserverInterface`, etc.
- **Abstract classes** for shared refactoring logic: `NamespaceRefactorerAbstract`
- **Enums** for PHP types: `IdentifierKindEnum`, `FileTypeEnum`, `FilesystemObserverOperationEnum`
- **Type aliases** instead of interfaces for pure data transfer objects: `NamespaceRefactorDetailsType`, `IdentifierType`
- No global singletons except the DI container
- `async/await` throughout all I/O operations
- `vscode.l10n.t()` for all user-facing strings

---

## Key File Paths

| File | Purpose |
|---|---|
| `src/extension.ts` | Extension entry point |
| `src/extension/model/Extension.ts` | Lifecycle, observer registration, lazy init |
| `src/container/registry/ContainerRegistry.ts` | All DI registrations |
| `src/service/namespace/parser/PhpParser.ts` | AST parser (php-parser wrapper) |
| `src/service/namespace/provider/NamespaceRegExpProvider.ts` | **Migration target**: replace all regex here |
| `src/service/namespace/abstract/NamespaceRefactorerAbstract.ts` | Shared refactoring methods (use statements, sorting) |
| `src/service/namespace/component/NamespaceSourceRefactorer.ts` | Source file refactoring |
| `src/service/namespace/component/NamespaceReferencesRefactorer.ts` | Workspace-wide reference updates |
| `src/service/namespace/resolver/NamespaceResolver.ts` | PSR-0/PSR-4 namespace resolution |
| `src/service/php/service/GlobalReservedService.ts` | Reserved name management |
| `package.json` | Commands, settings, menus, dependencies |
