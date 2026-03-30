import { IdentifierKindEnum } from "../enum/IdentifierKindEnum";
import { OffsetLocType } from "./OffsetLocType";

/**
 * Represents a parsed PHP use statement with its source location.
 */
export type UseStatementType = {
    /** Fully qualified name, e.g. "App\\Foo" */
    name: string;
    /** Oop for normal use, Function for use function, Constant for use const */
    kind: IdentifierKindEnum;
    /** Alias name if declared with `as`, otherwise null */
    alias: string | null;
    /** Character offset range of the entire use statement in the source */
    loc: OffsetLocType;
    /** True when this item belongs to a grouped statement, e.g. `use App\{Foo, Bar}` */
    grouped: boolean;
};
