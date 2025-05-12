# Change Log

All notable changes to the extension will be documented in this file.
<!-- Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file. -->

## [Unreleased]

### Changed
- Enhanced namespace refactoring to adjust `use` statements when moving files:
  - If the moved file references classes, interfaces, enums, or traits in the same namespace before the move, the necessary `use` statements are added to maintain valid references.
  - If the moved file is in the same namespace as classes, interfaces, enums, or traits it previously referenced via `use` statements, the now redundant `use` statements are removed.



## [0.4.0] - 2025-05-08

### Added
- Enhanced namespace refactoring to support file renaming operations
  - When a PHP file is renamed, the name of the definition (class, interface, enum, or trait) in the file is adjusted accordingly
  - All references to the definition in other files are automatically updated
  - Behavior is similar to the "moved file" functionality with additional identifier adaptation
- Added configuration `refactorNamespacesOnFileRenamed` to control behavior when files are renamed:
  - `confirm` (default): Prompts for confirmation before refactoring
  - `always`: Automatically refactors without confirmation
  - `never`: Disables the feature
- Improved confirmation dialog for namespace refactoring showing the new identifier name

### Changed
- Improved error handling during namespace refactoring
- Optimized performance for file operation processing



## [0.3.0] - 2025-05-07

### Added
- Introduced a feature to detect when a file is moved and automatically adjust the namespace within the file and all its references.
  - If the namespace changes, the `use` statement in the reference is updated accordingly.
  - If the files previously shared the same namespace, a `use` statement is added to the reference.
  - If the files were in different namespaces before and now share the same namespace, an existing `use` statement is removed.
  - If a fully qualified namespace is directly referenced (e.g., `new \App\MyClass()`), the statement is also updated to use the new namespace.
- Added configuration `refactorNamespacesOnFileMoved` to control the behavior of this feature with options:
  - `confirm` (default): Prompts for confirmation before refactoring.
  - `always`: Automatically refactors without confirmation.
  - `never`: Disables the feature.
- Added configuration `refactorNamespacesExcludeDirectories` to specify directories to exclude when searching for references.



## [0.2.0] - 2025-05-04

### Added
- Added setting to control inclusion of `declare(strict_types=1);` in generated files (default: `false`)
- Added setting `useFallbackNamespace` to use a fallback namespace when no namespace could be resolved (default: `false`)
- Added setting `fallbackNamespace` to define the namespace when `useFallbackNamespace` is enabled (default: `App`)

### Fixed
- Missleading and wrong translations



## [0.1.1] - 2025-05-04

### Fixed
- Missing package translations (nls) for es, fr and ru



## [0.1.0] - 2025-05-04

### Added
- First development version of the extension
- Support for creating PHP files, classes, interfaces, enums, and traits
- Support for automatic namespace detection based on Composer configuration
- Template options for PHP elements with pre-populated code
- Multi-language support (English, German, French, Spanish, Russian)
- Integration with VS Code Explorer context menu