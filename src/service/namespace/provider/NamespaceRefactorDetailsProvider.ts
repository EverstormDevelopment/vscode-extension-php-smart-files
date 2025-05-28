import * as vscode from "vscode";
import { getUriFileName } from "../../../utils/filesystem/getUriFileName";
import { isUriFile } from "../../../utils/filesystem/isUriFile";
import { getFileContentByUri } from "../../../utils/vscode/getFileContentByUri";
import { NamespaceResolver } from "../component/NamespaceResolver";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";
import { NamespaceRefactorUriDetailsType } from "../type/NamespaceRefactorUriDetailsType";
import { NamespaceIdentifierValidator } from "../validator/NamespaceIdentifierValidator";
import { NamespacePathValidator } from "../validator/NamespacePathValidator";
import { NamespaceRegExpProvider } from "./NamespaceRegExpProvider";

/**
 * Provides details about namespace refactoring operations for PHP files.
 * Gathers information about old and new URIs, identifiers, and namespaces.
 */
export class NamespaceRefactorDetailsProvider {
    constructor(
        protected readonly namespaceResolver: NamespaceResolver,
        protected readonly namespaceRegExpProvider: NamespaceRegExpProvider,
        protected readonly namespacePathValidator: NamespacePathValidator,
        protected readonly namespaceIdentifierValidator: NamespaceIdentifierValidator
    ) {}

    /**
     * Collects and returns all relevant details for a namespace refactor operation.
     * @param oldUri The URI of the original file.
     * @param newUri The URI of the new file location.
     * @returns An object containing details about the refactor operation.
     */
    public async get(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<NamespaceRefactorDetailsType> {
        const oldUriDetails = await this.getUriDetails(oldUri, newUri);
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
     * Retrieves and validates namespace and identifier information for a PHP file.
     *
     * This method first attempts to resolve namespace and identifier using path-based resolution.
     * If either is invalid according to PHP naming conventions, it falls back to analyzing the
     * file content to extract this information directly using regex patterns.
     *
     * @param uri The URI of the PHP file to analyze
     * @param sourceContentUri Optional URI to use for content extraction (used when a file is being moved)
     * @returns Details containing the URI, namespace, identifier and validation status
     */
    private async getUriDetails(
        uri: vscode.Uri,
        sourceContentUri?: vscode.Uri
    ): Promise<NamespaceRefactorUriDetailsType> {
        const contentUri = sourceContentUri || uri;
        const isContentFile = await isUriFile(contentUri);

        const namespace = await this.getNamespaceUnsafe(uri);
        const identifier = await this.getIdentifierUnsafe(uri);
        const isNamespaceValid = await this.namespacePathValidator.validate(namespace);
        const isIdentifierValid = await this.namespaceIdentifierValidator.validate(identifier);

        if (!isContentFile || (isNamespaceValid && isIdentifierValid)) {
            return { uri, namespace, identifier, isNamespaceValid, isIdentifierValid };
        }

        const contentInfo = await this.parseInformationFromContent(contentUri);
        return {
            uri,

            namespace: isNamespaceValid ? namespace : contentInfo.namespace,
            namespaceInvalid: isNamespaceValid ? undefined : namespace,
            isNamespaceValid: isNamespaceValid,

            identifier: isNamespaceValid && isIdentifierValid ? identifier : contentInfo.identifier,
            identifierInvalid: isIdentifierValid ? undefined : identifier,
            isIdentifierValid: isIdentifierValid,
        };
    }

    /**
     * Attempts to resolve a PHP namespace from the given URI path.
     * @param uri The URI to resolve the namespace from
     * @returns The resolved PHP namespace or empty string
     */
    private async getNamespaceUnsafe(uri: vscode.Uri): Promise<string> {
        return (await this.namespaceResolver.resolveUnsafe(uri)) || "";
    }

    /**
     * Extracts the filename from a URI to use as PHP class identifier.
     * @param uri The URI to get the filename from
     * @returns The filename without extension to use as PHP identifier
     */
    private async getIdentifierUnsafe(uri: vscode.Uri): Promise<string> {
        return getUriFileName(uri);
    }

    /**
     * Parses PHP file content to extract namespace declaration and class/interface/trait definition.
     * @param uri The URI of the PHP file to analyze
     * @returns Object containing the extracted namespace and identifier
     */
    private async parseInformationFromContent(uri: vscode.Uri): Promise<{
        namespace: string;
        identifier: string;
    }> {
        const content = await getFileContentByUri(uri);

        const definitionRegExp = this.namespaceRegExpProvider.getDefinitionRegExp();
        const definitionMatch = definitionRegExp.exec(content);
        const identifier = definitionMatch?.[2] || "";

        const namespaceRegExp = this.namespaceRegExpProvider.getNamespaceDeclarationRegExp();
        const namespaceMatch = namespaceRegExp.exec(content);
        const namespace = namespaceMatch?.[1] || "";

        return {
            namespace: namespace,
            identifier: identifier,
        };
    }
}
