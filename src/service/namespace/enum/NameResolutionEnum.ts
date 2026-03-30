/**
 * PHP name resolution strategy as reported by the AST parser.
 */
export enum NameResolutionEnum {
    /** Unqualified name: `Foo` */
    Uqn = "uqn",
    /** Partially qualified name: `Sub\Foo` */
    Qn = "qn",
    /** Fully qualified name: `\App\Foo` */
    Fqn = "fqn",
}
