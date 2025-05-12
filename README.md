# PHP Smart Files

<div align="center">

![PHP Smart Files](images/logo.png)

![Version](https://img.shields.io/badge/version-0.5.1-blue)
![Installs](https://img.shields.io/badge/installs-new-green)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

### PHP File Creation and Namespace Management Done Right



</div>

**Are you tired of manually adjusting namespaces when moving PHP files or creating new ones?** PHP Smart Files solves this problem with intelligent namespace management and automated refactoring.

## Table of Contents
- [Features](#features)
- [Usage](#usage)
- [Extension Settings](#extension-settings)
- [Why PHP Smart Files?](#why-php-smart-files)
- [Supported Languages](#supported-languages)
- [Requirements](#requirements)
- [Release Notes](#release-notes)
- [Feedback and Contributions](#feedback-and-contributions)
- [License](#license)

## Features

PHP Smart Files is a powerful extension for VS Code that streamlines your PHP development workflow by automating file creation and namespace management:

### 🚀 Smart PHP File Creation

Create PHP files with auto-detected namespaces based on your project's Composer configuration:

- **File Types**: Classes, interfaces, traits, and enums
- **Automatic Namespaces**: Intelligently follows PSR-4 standards from composer.json
- **Templates**: Create empty files or use pre-populated templates  
- **Context Menu Integration**: Right-click in the explorer to create PHP files

![File Creation](images/file-creation.gif)

### 🔄 Intelligent Namespace Refactoring

Save time and prevent bugs with automatic namespace handling when moving or renaming files:

- **Move Files**: Automatically adjusts namespaces and all references to moved files
- **Rename Files**: Updates class/interface/trait/enum names and all references automatically
- **Smart Use Statement Management**:
  - Adds missing use statements when needed
  - Removes redundant use statements when files share the same namespace
  - Updates fully qualified namespace references

![Namespace Refactoring](images/refactoring.gif)

## Usage

### Creating PHP Files

Right-click in the Explorer and select from the "Create PHP File" submenu:

#### Empty Files
- **Empty PHP File**: Creates a basic PHP file with namespace
- **Empty PHP Class**: Creates a PHP class with namespace and class declaration
- **Empty PHP Interface**: Creates a PHP interface with namespace
- **Empty PHP Enum**: Creates a PHP 8.1+ enum with namespace
- **Empty PHP Trait**: Creates a PHP trait with namespace

#### Template Files
- **PHP Class with Template**: Creates a PHP class with helpful boilerplate code
- **PHP Interface with Template**: Creates a PHP interface with method templates
- **PHP Enum with Template**: Creates a PHP enum with case examples
- **PHP Trait with Template**: Creates a PHP trait with method examples

All created files automatically detect the proper namespace based on your project's PSR-4 configuration in composer.json.

### Namespace Refactoring

Simply move or rename PHP files in your project, and PHP Smart Files will:

1. Detect the namespace change based on your project structure
2. Update the namespace within the file
3. Find and update all references to that file throughout your project
4. Adjust `use` statements as needed:
   - Adds missing use statements when files are moved to different namespaces
   - Removes redundant use statements when files are moved to the same namespace
   - Updates fully qualified namespace references

## Extension Settings

PHP Smart Files offers the following configuration options:

| Setting | Description | Default |
|---------|-------------|---------|
| `phpSmartFiles.useStrictTypeInTemplates` | Include `declare(strict_types=1);` in generated files | `false` |
| `phpSmartFiles.useFallbackNamespace` | Use fallback namespace when no namespace could be resolved | `false` |
| `phpSmartFiles.fallbackNamespace` | Define the fallback namespace to use | `App` |
| `phpSmartFiles.refactorNamespacesOnFileMoved` | Control behavior when files are moved:<br>- `confirm`: Prompt for confirmation<br>- `always`: Automatically refactor<br>- `never`: Disable feature | `confirm` |
| `phpSmartFiles.refactorNamespacesOnFileRenamed` | Control behavior when files are renamed:<br>- `confirm`: Prompt for confirmation<br>- `always`: Automatically refactor<br>- `never`: Disable feature | `confirm` |
| `phpSmartFiles.refactorNamespacesExcludeDirectories` | Directories to exclude when searching for references | *See configuration* |

## Why PHP Smart Files?

### For PHP Developers
- **Save Time**: No more manual namespace updates when refactoring
- **Prevent Errors**: Automatically maintain namespace consistency across your project
- **Smooth Workflow**: Create properly structured PHP files with a single click
- **Works with Composer**: Seamless integration with your project's PSR-4 configuration

### Compared to Other Extensions
- **Smart Namespace Detection**: Uses your composer.json for accurate namespace resolution
- **Full Refactoring**: Updates both the moved/renamed file AND all references to it
- **Intelligent Use Statement Management**: Adds or removes use statements as needed
- **File Templates**: Provides both empty files and useful templates for quick starts

## Supported Languages

This extension is available in multiple languages:
- English
- German (Deutsch)
- French (Français)
- Spanish (Español)
- Russian (Русский)

## Requirements

- Visual Studio Code 1.99.0 or higher
- PHP project (preferably with a composer.json file for optimal namespace detection)

## Release Notes

### Current Version: 0.5.1

This version includes improvements to namespace refactoring and bug fixes:
- Fixed cancellation of refactoring when renaming files to/from invalid PHP identifiers
- Enhanced namespace refactoring with intelligent `use` statement management

For a detailed list of changes in this and previous versions, please see the [CHANGELOG](CHANGELOG.md).

## Feedback and Contributions

Your feedback and contributions are welcome! If you encounter any issues or have suggestions for improvements:

- [Submit an issue](https://github.com/EverstormDevelopment/vscode-extension-php-smart-files/issues)
- [Contribute on GitHub](https://github.com/EverstormDevelopment/vscode-extension-php-smart-files)

## License

This extension is licensed under the [MIT License](LICENSE).

---

**Enjoying PHP Smart Files?** Consider [rating it](https://marketplace.visualstudio.com/items?itemName=everstorm.php-smart-files) in the VS Code Marketplace!