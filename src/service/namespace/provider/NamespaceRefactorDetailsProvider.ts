import * as vscode from "vscode";
import { getUriFileName } from "../../../utils/filesystem/getUriFileName";
import { getFileContentByUri } from "../../../utils/vscode/getFileContentByUri";
import { NamespaceResolver } from "../model/NamespaceResolver";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";
import { NamespaceRefactorUriDetailsType } from "../type/NamespaceRefactorUriDetailsType";
import { NamespaceRegExpProvider } from "./NamespaceRegExpProvider";

/**
 * Provides details about namespace refactoring operations for PHP files.
 * Gathers information about old and new URIs, identifiers, and namespaces.
 */
export class NamespaceRefactorDetailsProvider {
    /**
     * Initializes the provider with a NamespaceResolver and RegExp provider.
     * @param namespaceResolver Resolves namespaces for given file URIs.
     * @param namespaceRegExpProvider Provides RegExp utilities for PHP identifiers and namespaces.
     */
    constructor(
        protected readonly namespaceResolver: NamespaceResolver,
        protected readonly namespaceRegExpProvider: NamespaceRegExpProvider
    ) {}

    /**
     * Collects and returns all relevant details for a namespace refactor operation.
     * @param oldUri The URI of the original file.
     * @param newUri The URI of the new file location.
     * @returns An object containing details about the refactor operation.
     */
    public async get(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<NamespaceRefactorDetailsType> {
        const oldUriDetails = await this.getUriDetails(oldUri);
        const newUriDetails = await this.getUriDetails(newUri);

        const hasNamespaces = !!oldUriDetails.namespace && !!newUriDetails.namespace;
        const hasNamespaceChanged = oldUriDetails.namespace !== newUriDetails.namespace;
        const hasIdentifierChanged = oldUriDetails.identifier !== newUriDetails.identifier;
        const hasChanged = hasNamespaceChanged || hasIdentifierChanged;

        return {
            old: oldUriDetails,
            new: newUriDetails,
            hasNamespaces: hasNamespaces,
            hasNamespaceChanged: hasNamespaceChanged,
            hasIdentifierChanged: hasIdentifierChanged,
            hasChanged: hasChanged,
        };
    }

    /**
     * Gathers details for a specific file URI, including identifier and namespace.
     * If the file name is not a valid PHP identifier, attempts to extract the identifier from file content.
     * @param uri The file URI to analyze.
     * @param finalUri Optional: The final URI to use for content lookup.
     * @returns An object with URI details.
     */
    private async getUriDetails(uri: vscode.Uri, finalUri?: vscode.Uri): Promise<NamespaceRefactorUriDetailsType> {
        finalUri = finalUri || uri;
        const namespace = await this.getNamespace(uri);
        const fileName = getUriFileName(uri);
        const isFileNameValid = this.isFileNameValid(fileName);
        const identifier = isFileNameValid ? fileName : await this.getIdentifierFromContent(finalUri);

        return {
            uri: uri,
            identifier: identifier,
            namespace: namespace,
            fileName: fileName,
            isFileNameValid: isFileNameValid,
        };
    }

    /**
     * Resolves the namespace for a given file URI.
     * @param uri The file URI.
     * @returns The resolved namespace or an empty string.
     */
    private async getNamespace(uri: vscode.Uri): Promise<string> {
        const namespace = await this.namespaceResolver.resolve(uri);
        return namespace || "";
    }

    /**
     * Checks if a given file name is a valid PHP identifier.
     * @param fileName The file name to validate.
     * @returns True if valid, false otherwise.
     */
    private isFileNameValid(fileName: string): boolean {
        const validationRegExp = this.namespaceRegExpProvider.getIdentifierValidationRegExp();
        return validationRegExp.test(fileName);
    }

    /**
     * Extracts the identifier (class/interface/trait/enum name) from file content.
     * @param uri The file URI.
     * @returns The identifier if found, otherwise an empty string.
     */
    private async getIdentifierFromContent(uri: vscode.Uri): Promise<string> {
        const content = await getFileContentByUri(uri);
        const definitionRegExp = this.namespaceRegExpProvider.getDefinitionRegExp();
        const definitionMatch = definitionRegExp.exec(content);
        if (!definitionMatch?.[1]) {
            return "";
        }

        return definitionMatch[1];
    }
}
