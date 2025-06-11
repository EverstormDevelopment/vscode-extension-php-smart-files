import { IdentifierKindEnum } from "./../enum/IdentifierKindEnum";
import * as vscode from "vscode";
import { getUriFileName } from "../../../utils/filesystem/getUriFileName";
import { isUriFile } from "../../../utils/filesystem/isUriFile";
import { getFileContentByUri } from "../../../utils/vscode/getFileContentByUri";
import { NamespaceResolver } from "../resolver/NamespaceResolver";
import { IdentifierType } from "../type/IdentifierType";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";
import { NamespaceRefactorUriDetailsType } from "../type/NamespaceRefactorUriDetailsType";
import { NamespaceIdentifierValidator } from "../validator/NamespaceIdentifierValidator";
import { NamespacePathValidator } from "../validator/NamespacePathValidator";
import { NamespaceRegExpProvider } from "./NamespaceRegExpProvider";
import { PhpParser } from "../parser/PhpParser";

type ContentDetailsType = {
    namespace: string | undefined;
    identifiers: IdentifierType[];
    isFile: boolean;
};

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
        const contentDetails = await this.getContentDetails(newUri);
        const oldUriDetails = await this.getUriDetails(oldUri, contentDetails);
        const newUriDetails = await this.getUriDetails(newUri, contentDetails);

        const hasNamespaces = !!oldUriDetails.namespace && !!newUriDetails.namespace;
        const hasNamespaceChanged = oldUriDetails.namespace !== newUriDetails.namespace;
        const hasIdentifierChanged = oldUriDetails.fileIdentifier.name !== newUriDetails.fileIdentifier.name;
        const hasChanged = hasNamespaceChanged || hasIdentifierChanged;

        return {
            old: oldUriDetails,
            new: newUriDetails,
            identifiers: contentDetails.identifiers,
            hasNamespaces: hasNamespaces,
            hasNamespaceChanged: hasNamespaceChanged,
            hasIdentifierChanged: hasIdentifierChanged,
            hasChanged: hasChanged,
        };
    }

    private async getContentDetails(uri: vscode.Uri): Promise<ContentDetailsType> {
        const isContentFile = await isUriFile(uri);
        if (!isContentFile) {
            return { namespace: undefined, identifiers: [], isFile: false };
        }

        const content = await getFileContentByUri(uri);
        const parser = new PhpParser(content, getUriFileName(uri, true));
        return {
            namespace: parser.getNamespace(),
            identifiers: parser.getTopLevelIdentifiers(),
            isFile: true,
        };
    }

    private async getUriDetails(
        uri: vscode.Uri,
        contentDetails: ContentDetailsType
    ): Promise<NamespaceRefactorUriDetailsType> {
        const namespaceUnsafe = await this.namespaceResolver.resolveUnsafe(uri);
        const isNamespaceValid = await this.namespacePathValidator.validate(namespaceUnsafe);
        const namespaceInvalid = isNamespaceValid ? undefined : namespaceUnsafe;
        const namespace = (isNamespaceValid ? namespaceUnsafe : contentDetails.namespace) || "";

        const fileIdentifierUnsafe = getUriFileName(uri);
        const isFileIdentifierValid = await this.namespaceIdentifierValidator.validate(fileIdentifierUnsafe);
        const fileIdentifierInvalid = isFileIdentifierValid ? undefined : fileIdentifierUnsafe;
        const fileIdentifier: IdentifierType = isFileIdentifierValid
            ? { name: fileIdentifierUnsafe, kind: IdentifierKindEnum.Oop }
            : this.getOopIdentifier(contentDetails.identifiers) || { name: "", kind: IdentifierKindEnum.Oop };

        return {
            uri,
            namespace,
            namespaceInvalid,
            isNamespaceValid,
            fileIdentifier,
            fileIdentifierInvalid,
            isFileIdentifierValid,
        };
    }

    private getOopIdentifier(identifiers: IdentifierType[]): IdentifierType | undefined {
        return identifiers.find((identifier) => {
            switch (identifier.kind) {
                case IdentifierKindEnum.Oop:
                case IdentifierKindEnum.Class:
                case IdentifierKindEnum.Interface:
                case IdentifierKindEnum.Trait:
                case IdentifierKindEnum.Enum:
                    return true;
                default:
                    return false;
            }
        });
    }
}
