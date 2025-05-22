# Change Log

All notable changes to the "PHP Smart Files" extension will be documented in this file.
<!-- Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file. -->



## [Unreleased]

### Fixed
- Fixed handling of multiple interfaces in class declarations:
  - Properly recognizes and refactors all interfaces in comma-separated lists when implementing multiple interfaces
  - Ensures consistent refactoring of all interfaces in `implements` clauses
- Improved detection of static access to prevent incorrect refactoring:
  - Fixed issue where the last segment of a fully qualified namespace was incorrectly detected as a standalone class reference
  - Prevents adding unnecessary `use` statements for classes that are already referenced with their full namespace



## [0.8.2] - 2025-05-22

### Improved
- Enhanced file creation workflow by automatically saving files after template insertion, eliminating the need for manual saves
- Improved PHP reserved keywords handling:
  - Expanded and optimized the centralized list of PHP reserved keywords and types
  - Standardized keyword validation across the extension for consistency
  - Improved filtering of found references to prevent false positives (like `void` or `boolean`)
  - Enhanced filename validation to properly reject all reserved PHP keywords

### Fixed
- Fixed incomplete refactoring of type references:
  - Now properly detects and updates type hints in function parameters when classes are moved or renamed
  - Now properly detects and updates return type declarations when referenced classes are moved or renamed
  - Ensures complete refactoring of all code references, which was previously incomplete
- Fixed issue with self-references in class files during namespace changes:
  - Prevented unnecessary `use` statements when a class references itself (e.g., using `MyClass::$SOMETHING`) after moving to a different namespace
- Fixed critical issue with file content handling:
  - Now properly detects changes in all open documents, not just visible tabs
  - Changed detection mechanism from checking visible editors to checking all text documents
  - This ensures that modifications to files in non-visible tabs are correctly captured and processed
  - Prevents potential data loss when refactoring files that are open but not visible



## [0.8.1] - 2025-05-21

### Changed
- Added extension icon/logo
- Added demonstration GIFs showing key features in action
- Significantly improved README documentation

### Fixed
- Fixed case-insensitive recognition of PHP keywords:
  - Now properly recognizes PHP keywords like `namespace`, `use`, `class`, `interface`, `enum`, `trait`, etc. in any case variant (e.g., `NameSpace`, `USE`, `Class`)
  - This resolves issues where statements like `Namespace App\Foo` or `use App\Foo AS Bar` were not correctly recognized
  - All regex patterns for PHP keywords have been updated to handle case-insensitivity, matching PHP's own case-insensitive keyword handling



## [0.8.0] - 2025-05-19

### Changed
- Improved file and directory observers to work in a truly lazy manner:
  - Observers register only when PHP files exist in the workspace
  - Observers now dynamically register when the first PHP file is added to a previously non-PHP project
  - This ensures proper refactoring support even when PHP files are added later to an initially non-PHP project
- Enhanced fallback namespace mechanism:
  - When enabled, the fallback namespace now builds the complete namespace based on the file location relative to the workspace directory
  - Previously, it would only use the configured fallback namespace value without considering the file path structure
  - This provides a more intuitive namespace structure that mirrors the directory hierarchy even when composer.json is absent
- Improved configuration descriptions for namespace settings:
  - Updated descriptions of `useFallbackNamespace` and `fallbackNamespace` settings to better explain the new namespace construction mechanism
  - Added clear examples showing how directory structure is incorporated into the namespace
  - Made descriptions more consistent and comprehensive across all supported languages
- Refined filename validation with more specific error messages:
  - Split generic "invalid characters" error into two distinct messages
  - Added specific feedback for filesystem-invalid characters
  - Added warning for characters that may cause issues with PHP includes or URLs
- Added namespace validation to prevent invalid namespaces:
  - Invalid directory structures no longer generate invalid PHP namespaces
  - Validation ensures all namespaces are valid PHP identifiers
- Improved error handling with better messaging:
  - Converted acceptable but important issues from error messages to warnings
  - Redesigned notification messages to communicate problems more clearly and effectively
  - Enhanced visual distinction between critical errors and important warnings

### Fixed
- Fixed refactoring issue with files that were previously in invalid directories:
  - Corrected handling of files that are moved from invalid to valid directories
  - Fixed namespace updates when an invalid directory is renamed to a valid one
  - Now properly updates class definition and all references when namespace becomes valid after a move/rename operation
  - Ensures consistent refactoring even when files transition from invalid to valid namespace contexts



## [0.7.0] - 2025-05-16

### Added
- Added support for directory operations (renaming/moving):
  - All files within a changed directory are now refactored as if they were individually moved
  - Namespace declarations in all affected files are automatically adjusted
  - All references to the affected files in the workspace are updated accordingly
- Added configuration `refactorNamespacesOnDirectoryChanges` to control behavior when directories are renamed or moved:
  - `confirm` (default): Prompts for confirmation before refactoring
  - `always`: Automatically refactors without confirmation
  - `never`: Disables the feature

### Changed
- Significantly improved performance by processing reference updates in parallel
- Now preserving line break styles (CR, LF, CRLF) in all refactored files



## [0.6.0] - 2025-05-14

### Added
- Added specialized templates for Symfony components:
  - Controller with proper route attributes and render method
  - Command with complete structure following Symfony console conventions
  - Form Type with buildForm and configureOptions methods
- Added support for refactoring when renaming from invalid to valid PHP filenames instead of aborting the operation
- Added support for detecting and refactoring use statements with aliases when moving or renaming PHP files

### Changed
- Optimized extension performance by only activating file observers when PHP files exist in workspace
- Renamed extension from "PHP File Creator" to "PHP Smart Files" to better reflect its expanded capabilities
- Improved wording of placeholders in code templates for better clarity and usability



## [0.5.1] - 2025-05-12

### Fixed
- Cancel refactor on renaming files from or to invalid PHP identifier



## [0.5.0] - 2025-05-12

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
- Misleading and wrong translations



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