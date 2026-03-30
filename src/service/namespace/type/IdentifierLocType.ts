import { OffsetLocType } from "./OffsetLocType";
import { IdentifierType } from "./IdentifierType";

/**
 * Extends IdentifierType with the character offset of the name token in the source file.
 */
export type IdentifierLocType = IdentifierType & {
    /** Character offset range of the name token (not the full declaration) */
    nameLoc: OffsetLocType;
};
