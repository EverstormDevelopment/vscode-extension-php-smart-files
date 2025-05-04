# Change Log

All notable changes to the extension will be documented in this file.
<!-- Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file. -->



## [Unreleased]



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