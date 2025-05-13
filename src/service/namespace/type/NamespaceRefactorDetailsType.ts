import { NamespaceRefactorUriDetailsType } from "./NamespaceRefactorUriDetailsType";

export type NamespaceRefactorDetailsType = {
    old: NamespaceRefactorUriDetailsType;
    new: NamespaceRefactorUriDetailsType;
    hasNamespaces: boolean;
    hasNamespaceChanged: boolean;
    hasIdentifierChanged: boolean;
    hasChanged: boolean;
};
