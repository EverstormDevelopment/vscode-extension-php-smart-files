import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";

export interface NamespaceRefactorerInterface {
    refactor(refactorDetails: NamespaceRefactorDetailsType): Promise<boolean>;
}
