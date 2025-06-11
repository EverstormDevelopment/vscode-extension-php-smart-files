import { IdentifierKindEnum } from "../../../service/namespace/enum/IdentifierKindEnum";

/**
 * Returns the appropriate PHP "use" statement type prefix based on the identifier kind.
 * In PHP, there are different types of use statements:
 * - Regular class/namespace imports (no prefix)
 * - Function imports (prefixed with "function ")
 * - Constant imports (prefixed with "const ")
 * @param kind The kind of identifier being imported
 * @returns The appropriate prefix for the PHP use statement ("function ", "const ", or empty string)
 */
export function getUseTypeByKind(kind: IdentifierKindEnum): string {
    switch (kind) {
        case IdentifierKindEnum.Function:
            return "function ";
        case IdentifierKindEnum.Constant:
            return "const ";
        default:
            return "";
    }
}
