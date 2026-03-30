import { IdentifierKindEnum } from "../enum/IdentifierKindEnum";
import { NameResolutionEnum } from "../enum/NameResolutionEnum";
import { OffsetLocType } from "./OffsetLocType";

/**
 * Represents a single name reference found in PHP source code during AST traversal.
 */
export type NameReferenceType = {
    /** Identifier name without leading backslash, e.g. "App\\Foo" for FQN or "Foo" for UQN */
    name: string;
    /** Semantic kind of the reference: Oop for class names, Function for calls, Constant for bare names */
    kind: IdentifierKindEnum;
    /** How the name is resolved: unqualified, partially qualified, or fully qualified */
    resolution: NameResolutionEnum;
    /** Character offset range in the source. For FQN, start includes the leading backslash. */
    loc: OffsetLocType;
};
