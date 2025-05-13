import * as vscode from "vscode";
import { getUriFileName } from "../../../utils/filesystem/getUriFileName";
import { escapeRegExp } from "../../../utils/regexp/escapeRegExp";
import { NamespaceRefactorerInterface } from "../interface/NamespaceRefactorerInterface";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailType";
import { NamespaceResolver } from "./NamespaceResolver";

/**
 * Abstract class for refactoring namespaces in PHP files.
 */
export abstract class NamespaceRefactorerAbstract implements NamespaceRefactorerInterface {
    /**
     * Initializes the NamespaceRefactorer with a NamespaceResolver.
     * @param namespaceResolver Resolves namespaces for given file URIs.
     */
    constructor(protected readonly namespaceResolver: NamespaceResolver) {}

    /**
     * Refactors the namespace and identifiers in a PHP file.
     * @param oldUri The URI of the old file location.
     * @param newUri The URI of the new file location.
     * @returns A promise that resolves to true if refactoring was successful, false otherwise.
     */
    public abstract refactor(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<boolean>;

    /**
     * Updates class identifier references within the file content.
     * Ensures that identifiers are updated to reflect namespace or class name changes.
     * @param content The content of the file to refactor.
     * @param fileNamespace The current namespace of the file.
     * @param refactorDetails The details of the namespace refactor operation.
     * @returns The updated content with refactored identifiers.
     */
    protected refactorIdentifier(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): string {
        const newFullyQualifiedNamespace = `${refactorDetails.newNamespace}\\${refactorDetails.newIdentifier}`;
        const useStatementRegExp = this.getUseStatementRegExp(newFullyQualifiedNamespace);
        if (!useStatementRegExp.test(content) && fileNamespace !== refactorDetails.newNamespace) {
            return content;
        }

        const identifierRegExp = this.getIdentifierRegExp(refactorDetails.oldIdentifier);
        return content.replace(identifierRegExp, refactorDetails.newIdentifier);
    }

    /**
     * Adds a `use` statement for a given namespace and identifier to the file content.
     * Ensures that duplicate `use` statements are not added.
     * @param content The content of the file to update.
     * @param namespace The namespace to add.
     * @param identifier The identifier (class name) to add.
     * @returns The updated content with the new `use` statement.
     */
    protected addUseStatement(content: string, namespace: string, identifier: string): string {
        const fullQualifiedNamespace = `${namespace}\\${identifier}`;
        const hasUseStatementRegExp = this.getUseStatementByIdentiferRegExp(identifier);
        if (hasUseStatementRegExp.test(content)) {
            return content;
        }

        const namespaceDeclarationRegExp = this.getNamespaceDeclarationRegExp();
        const namespaceDeclarationMatch = content.match(namespaceDeclarationRegExp);
        if (!namespaceDeclarationMatch) {
            return content;
        }

        const useStatement = `use ${fullQualifiedNamespace};`;

        const lastUseStatementRegExp = this.getLastUseStatementRegExp();
        const lastUseStatementMatch = content.match(lastUseStatementRegExp);
        if (lastUseStatementMatch) {
            const lastUseMatch = lastUseStatementMatch[lastUseStatementMatch.length - 1];
            return content.replace(lastUseMatch, `${lastUseMatch}\n${useStatement}`);
        }

        return content.replace(namespaceDeclarationMatch[0], `${namespaceDeclarationMatch[0]}\n\n${useStatement}`);
    }

    /**
     * Removes a `use` statement for a given namespace and identifier from the file content.
     * @param content The content of the file to update.
     * @param namespace The namespace to remove.
     * @param identifier The identifier (class name) to remove.
     * @returns The updated content with the `use` statement removed.
     */
    protected removeUseStatement(content: string, namespace: string, identifier: string): string {
        const fullQualifiedNamespace = `${namespace}\\${identifier}`;
        const useStatementRegExp = this.getUseStatementRegExp(fullQualifiedNamespace);
        const useStatementWithLineBreakRegExp = new RegExp(
            `${useStatementRegExp.source}\\s*?\\r?\\n?\\r?`,
            useStatementRegExp.flags
        );

        return content.replace(useStatementWithLineBreakRegExp, "");
    }

    /**
     * Retrieves the content of a file, either from an open editor or by reading from disk.
     * @param uri The URI of the file to read.
     * @returns The content of the file as a string.
     */
    protected async getFileContent(uri: vscode.Uri): Promise<string> {
        const editor = this.findOpenEditor(uri);
        if (editor) {
            return editor.document.getText();
        }

        const fileContent = await vscode.workspace.fs.readFile(uri);
        return fileContent.toString();
    }

    /**
     * Updates the content of a file, either in an open editor or directly on disk.
     * Preserves the editor's dirty state if the file is already open.
     * @param uri The URI of the file to update.
     * @param content The new content to write to the file.
     */
    protected async updateFileContent(uri: vscode.Uri, content: string): Promise<void> {
        const openEditor = this.findOpenEditor(uri);
        if (!openEditor) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf8"));
            return;
        }

        const wasDirty = openEditor.document.isDirty;
        const fullRange = new vscode.Range(
            openEditor.document.positionAt(0),
            openEditor.document.positionAt(openEditor.document.getText().length)
        );

        await openEditor.edit((editBuilder) => {
            editBuilder.replace(fullRange, content);
        });

        if (!wasDirty) {
            await openEditor.document.save();
        }
    }

    /**
     * Finds an open TextEditor for the specified file URI.
     * @param uri The URI of the file to find.
     * @returns The open TextEditor, or undefined if no editor is open for the file.
     */
    protected findOpenEditor(uri: vscode.Uri): vscode.TextEditor | undefined {
        return vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === uri.toString());
    }

    /**
     * Retrieves comprehensive details about the namespace refactor operation.
     * Compares old and new namespaces and identifiers to determine what changes are needed.
     * @param oldUri The URI of the old file location.
     * @param newUri The URI of the new file location.
     * @returns An object containing detailed information about the refactor operation.
     */
    protected async getRefactorDetails(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<NamespaceRefactorDetailsType> {
        const oldNamespace = (await this.namespaceResolver.resolve(oldUri)) || "";
        const newNamespace = (await this.namespaceResolver.resolve(newUri)) || "";
        const oldIdentifier = getUriFileName(oldUri);
        const newIdentifier = getUriFileName(newUri);
        const hasNamespaces = !!oldNamespace && !!newNamespace;
        const hasNamespaceChanged = oldNamespace !== newNamespace;
        const hasIdentifierChanged = oldIdentifier !== newIdentifier;
        const hasChanged = hasNamespaceChanged || hasIdentifierChanged;

        return {
            oldUri: oldUri,
            newUri: newUri,
            oldIdentifier: oldIdentifier,
            newIdentifier: newIdentifier,
            oldNamespace: oldNamespace,
            newNamespace: newNamespace,
            hasNamespaces: hasNamespaces,
            hasNamespaceChanged: hasNamespaceChanged,
            hasIdentifierChanged: hasIdentifierChanged,
            hasChanged: hasChanged,
        };
    }

    /**
     * Creates a regular expression to match any namespace declaration.
     * @returns A regular expression that captures the namespace name.
     */
    protected getNamespaceDeclarationRegExp(): RegExp {
        return new RegExp(/[^\r\n\s]*namespace\s+([\p{L}\d_\\]+)\s*;/mu);
    }

    /**
     * Creates a regular expression to match `use` statements for a specific namespace.
     * @param fullyQualifiedNamespace The fully qualified namespace to match in use statements.
     * @returns A regular expression for matching use statements.
     */
    protected getUseStatementRegExp(fullyQualifiedNamespace: string): RegExp {
        const escapedNamespace = escapeRegExp(fullyQualifiedNamespace);
        return new RegExp(`use\\s+${escapedNamespace}\\s*;`, "gu");
    }

    /**
     * Creates a regular expression to match `use` statements for a specific identifier.
     * @param identifier The identifier to match in use statements.
     * @returns A regular expression for matching use statements.
     */
    protected getUseStatementByIdentiferRegExp(identifier: string): RegExp {
        const escapedIdentifier = escapeRegExp(identifier);
        // Ensure at least one `\` precedes the identifier, so we exclude `use` statements for other classes.
        return new RegExp(`use\\s+[\\p{L}\\d_\\\\]+\\\\${escapedIdentifier}\\s*;`, "gu");
    }

    /**
     * Creates a regular expression to match the last `use` statement in a file.
     * Used to determine where to add new use statements.
     * @returns A regular expression for matching use statements.
     */
    protected getLastUseStatementRegExp(): RegExp {
        return new RegExp(/^use\s+[\p{L}\d_\\]+\s*;/gmu);
    }

    /**
     * Creates a regular expression to match standalone identifiers.
     * Includes word boundary checks to prevent partial matches.
     * @param identifier The identifier to match.
     * @returns A regular expression for matching the identifier.
     */
    protected getIdentifierRegExp(identifier: string): RegExp {
        const escapedIdentifier = escapeRegExp(identifier);
        return new RegExp(`(?<![\\p{L}\\d_\\\\])${escapedIdentifier}(?![\\p{L}\\d_\\\\])`, "gu");
    }
}
