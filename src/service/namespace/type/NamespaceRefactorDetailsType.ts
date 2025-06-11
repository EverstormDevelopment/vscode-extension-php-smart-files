import { IdentifierType } from "./IdentifierType";
import { NamespaceRefactorUriDetailsType } from "./NamespaceRefactorUriDetailsType";

/**
 * Type definition for namespace refactoring operation details.
 * Contains all necessary information about the before and after states
 * of a file being refactored, along with flags indicating what has changed.
 */
export type NamespaceRefactorDetailsType = {
    /**
     * Details about the original state before refactoring
     */
    old: NamespaceRefactorUriDetailsType;

    /**
     * Details about the new state after refactoring
     */
    new: NamespaceRefactorUriDetailsType;

    
    identifiers: IdentifierType[];

    /**
     * Indicates whether both old and new locations have namespaces
     */
    hasNamespaces: boolean;

    /**
     * Indicates whether the namespace part has changed
     */
    hasNamespaceChanged: boolean;

    /**
     * Indicates whether the class/interface/trait name has changed
     */
    hasIdentifierChanged: boolean;

    /**
     * General flag indicating if any relevant change has occurred
     */
    hasChanged: boolean;
};
