# PHP Smart Files

<div align="center">

[![Version](https://img.shields.io/visual-studio-marketplace/v/everstorm.php-smart-files)](https://marketplace.visualstudio.com/items?itemName=everstorm.php-smart-files)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/everstorm.php-smart-files)](https://marketplace.visualstudio.com/items?itemName=everstorm.php-smart-files)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/everstorm.php-smart-files)](https://marketplace.visualstudio.com/items?itemName=everstorm.php-smart-files&ssr=false#review-details)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

### Smart PHP File Creation & Intelligent Namespace Management

**Simplify your PHP development!** Create properly structured files with smart templates while automatic namespace management handles refactoring and references

</div>

## Table of Contents
- [Features](#features)
- [Usage](#usage)
- [Extension Settings](#extension-settings)
- [Why PHP Smart Files?](#why-php-smart-files)
- [Available Languages](#available-languages)
- [Requirements](#requirements)
- [Release Notes](#release-notes)
- [Feedback and Contributions](#feedback-and-contributions)
- [License](#license)

## Features

PHP Smart Files extends VS Code to enhance your PHP development workflow through automated file creation and intelligent namespace management:

### 🚀 Smart PHP File Creation

Create PHP files with auto-detected namespaces based on your project's Composer configuration:

- **File Types**: Classes, interfaces, traits, and enums
- **Automatic Namespaces**: Intelligently follows PSR-4 standards from composer.json
- **Template Options**:
  - Basic empty files
  - Pre-populated templates with boilerplate code
  - Specialized Symfony templates (Controllers, Commands, Form Types)
- **Context Menu Integration**: Right-click in the explorer to create PHP files

> 💡 **Tip:** You can enable strict type declarations (`declare(strict_types=1);`) for all generated files through the extension settings

![File Creation](images/file-creation.gif)

### 🔄 Intelligent Namespace Refactoring

Save time and prevent bugs with comprehensive namespace management:

- **File Operations**:
  - Move files: Automatically adjust namespaces and all references
  - Rename files: Update class/interface/trait/enum names and all references
  - Manage directories: Refactor all files within moved/renamed directories
- **Smart Use Statement Management**:
  - Adds missing use statements when needed
  - Removes redundant use statements when files share namespace
  - Updates fully qualified namespace references
  - Supports use statements with aliases
- **Efficient Processing**: Handles reference updates in parallel for better performance
- **Flexible Configuration**: Control refactoring behavior for each operation type

![Namespace Refactoring](images/refactoring.gif)

## Usage

### Creating PHP Files

Right-click in the Explorer and select from the "Create PHP File" submenu:

#### Basic Files
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

#### Symfony Templates
- **Symfony Controller**: Creates a controller with route attributes and render method
- **Symfony Command**: Creates a command with complete structure following Symfony console conventions
- **Symfony Form Type**: Creates a form type with buildForm and configureOptions methods

All created files automatically detect the proper namespace based on your project's PSR-4 configuration in composer.json or (when enabled) fall back to an intelligent directory-based namespace structure.

### Namespace Refactoring

The extension automatically refactors namespaces and references during standard file operations:

- Simply **move files** between directories or **rename files** in your editor or file explorer
- When prompted, confirm the refactoring operation (if using default settings)
- That's it! The extension handles all namespace updates, class renames, and reference adjustments

> 💡 **Tip:** Use the extension settings to control whether confirmations are shown or to disable specific refactoring features

## Extension Settings

PHP Smart Files offers comprehensive configuration options:

| Setting | Description | Default |
|---------|-------------|---------|
| `phpSmartFiles.useStrictTypeInTemplates` | Include `declare(strict_types=1);` in generated files | `false` |
| `phpSmartFiles.useFallbackNamespace` | Use fallback namespace when no namespace could be resolved | `false` |
| `phpSmartFiles.fallbackNamespace` | Base namespace for fallback (builds complete namespace based on file location) | `App` |
| `phpSmartFiles.refactorNamespacesOnFileMoved` | Control behavior when files are moved<br>- `confirm`: Prompt for confirmation<br>- `always`: Automatically refactor<br>- `never`: Disable feature | `confirm` |
| `phpSmartFiles.refactorNamespacesOnFileRenamed` | Control behavior when files are renamed<br>- `confirm`: Prompt for confirmation<br>- `always`: Automatically refactor<br>- `never`: Disable feature | `confirm` |
| `phpSmartFiles.refactorNamespacesOnDirectoryChanges` | Control behavior when directories are moved or renamed<br>- `confirm`: Prompt for confirmation<br>- `always`: Automatically refactor<br>- `never`: Disable feature | `confirm` |
| `phpSmartFiles.refactorNamespacesExcludeDirectories` | Directories to exclude when searching for references | Common directories like `vendor`, `node_modules`, etc. |

## Why PHP Smart Files?

### For PHP Developers
- **Save time**: Eliminate manual namespace updates when refactoring
- **Prevent errors**: Maintain namespace consistency across your project
- **Improve workflow**: Create properly structured PHP files with a single click
- **Works with Composer**: Connect seamlessly with your project's PSR-4 configuration
- **Supports Symfony**: Access specialized templates for Symfony development

### What Makes It Special
- **Smart namespace handling**: Use your composer.json for accurate namespace resolution with intelligent fallback
- **Full-scope refactoring**: Update both the changed files AND all references to them
- **Directory-aware operations**: Intelligently process directory-level changes with the same precision as file operations
- **Efficient reference handling**: Process reference updates in parallel to speed up operations in large projects
- **Format integrity**: Respects your preferred line break style (CR, LF, CRLF) during file operations

## Available Languages

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

### Current Version: 0.8.0

This version includes significant improvements:
- Enhanced fallback namespace with directory structure integration
- Support for directory operations (move/rename)
- Parallel processing for performance improvements
- Improved error handling with clearer warning and error messages
- Specialized Symfony templates (Controller, Command, Form Type)

For a detailed list of changes in this and previous versions, please see the [CHANGELOG](CHANGELOG.md).

## Feedback and Contributions

Your feedback and contributions are welcome! If you encounter any issues or have suggestions for improvements:

- [Submit an issue](https://github.com/EverstormDevelopment/vscode-extension-php-smart-files/issues)
- [Contribute on GitHub](https://github.com/EverstormDevelopment/vscode-extension-php-smart-files)

## License

This extension is licensed under the [MIT License](LICENSE).

---

**Enjoying PHP Smart Files?** Consider [rating it](https://marketplace.visualstudio.com/items?itemName=everstorm.php-smart-files) in the VS Code Marketplace!
