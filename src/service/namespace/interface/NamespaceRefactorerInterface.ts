import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";

/**
 * Interface for namespace refactoring operations in PHP files.
 * Defines the contract that all namespace refactorers must fulfill.
 */
export interface NamespaceRefactorerInterface {
    /**
     * Performs namespace refactoring based on the provided details.
     * @param refactorDetails Information about the namespace changes to apply.
     * @returns A promise that resolves to true if refactoring was performed, false otherwise.
     */
    refactor(refactorDetails: NamespaceRefactorDetailsType): Promise<boolean>;
}
