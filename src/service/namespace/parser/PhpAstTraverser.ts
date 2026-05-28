import type { Program as AST } from "php-parser";
import { IdentifierKindEnum } from "../enum/IdentifierKindEnum";
import { NameResolutionEnum } from "../enum/NameResolutionEnum";
import { NameReferenceType } from "../type/NameReferenceType";

/**
 * Traversal context indicating the semantic role of the current position in the AST.
 * Used to classify unqualified name nodes (UQN) as Oop, Function, or Constant.
 */
type TraversalContext = "oop" | "function" | "constant" | "generic";

/**
 * Traverses a PHP AST and collects all name references, classified by kind and resolution.
 * Instantiate per file — do not register in the DI container.
 */
export class PhpAstTraverser {
    /**
     * PHP built-in type names that must not be emitted as OOP references.
     */
    private static readonly builtInTypes = new Set([
        "int",
        "integer",
        "float",
        "double",
        "string",
        "bool",
        "boolean",
        "array",
        "object",
        "callable",
        "iterable",
        "void",
        "null",
        "true",
        "false",
        "never",
        "mixed",
        "self",
        "static",
        "parent",
        "resource",
    ]);

    /**
     * Creates a new PhpAstTraverser instance.
     * @param ast The parsed PHP AST to traverse
     * @param sourceCode The original PHP source code, used for offset-based location lookups
     */
    constructor(
        private readonly ast: AST,
        private readonly sourceCode: string = "",
    ) {}

    /**
     * Returns all name references found in the AST.
     * @param deduplicate When true, returns one entry per unique resolution+kind+name (for analysis).
     *                    When false, returns every occurrence with its source location (for write ops).
     * @returns Array of NameReferenceType sorted in document order.
     */
    public getNameReferences(deduplicate: boolean): NameReferenceType[] {
        const refs: NameReferenceType[] = [];
        this.collect(this.ast, "generic", refs);

        if (!deduplicate) {
            return refs;
        }

        const seen = new Set<string>();
        return refs.filter((ref) => {
            const key = `${ref.resolution}:${ref.kind}:${ref.name}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Recursively collects name references from a node, propagating the current traversal context.
     * @param node The AST node or value to traverse.
     * @param context The semantic context of the current traversal position.
     * @param refs Accumulator for collected references.
     */
    private collect(node: any, context: TraversalContext, refs: NameReferenceType[]): void {
        if (!node || typeof node !== "object") {
            return;
        }
        if (Array.isArray(node)) {
            node.forEach((child) => this.collect(child, context, refs));
            return;
        }

        switch (node.kind) {
            case "name":
                this.addNameRef(node, context, refs);
                return;

            case "namespace":
                // Skip the namespace keyword+name; only traverse namespace body
                this.collect(node.children, "generic", refs);
                return;

            case "usegroup":
                // Skip use declarations — extracted separately via PhpParser.getUseStatements()
                return;

            case "class":
            case "interface":
            case "trait":
            case "enum":
                this.collectFromClassLike(node, refs);
                return;

            case "new":
                this.collect(node.what, "oop", refs);
                this.collect(node.arguments, "generic", refs);
                return;

            case "call":
                // Simple name call is a function call; anything else (method, closure, etc.) recurse generically
                if (node.what?.kind === "name") {
                    this.collect(node.what, "function", refs);
                } else {
                    this.collect(node.what, "generic", refs);
                }
                this.collect(node.arguments, "generic", refs);
                return;

            case "staticcall":
                this.collect(node.what, "oop", refs);
                this.collect(node.arguments, "generic", refs);
                return;

            case "staticlookup":
                this.collect(node.what, "oop", refs);
                return;

            case "instanceof":
                this.collect(node.left, "generic", refs);
                this.collect(node.right, "oop", refs);
                return;

            case "traituse":
                this.collect(node.traits, "oop", refs);
                return;

            case "catch":
                this.collect(node.what, "oop", refs);
                this.collect(node.body, "generic", refs);
                return;

            case "parameter":
                this.collectAttributeGroups(node.attrGroups, refs);
                this.collectFromType(node.type, refs);
                this.collect(node.value, "generic", refs);
                return;

            case "function":
            case "method":
            case "closure":
            case "arrowfunc":
                this.collectAttributeGroups(node.attrGroups, refs);
                this.collectFromType(node.type, refs);
                this.collect(node.arguments, "generic", refs);
                this.collect(node.body, "generic", refs);
                return;

            case "property":
            case "classconstant":
                this.collectAttributeGroups(node.attrGroups, refs);
                this.collectFromType(node.type, refs);
                this.collect(node.value, "generic", refs);
                return;

            case "attrgroup":
                this.collectFromAttrGroup(node, refs);
                return;

            default:
                this.collectChildren(node, context, refs);
        }
    }

    /**
     * Collects OOP references from class-like declarations (class, interface, trait, enum).
     * Traverses extends, implements, and the class body.
     * @param node The class-like declaration node.
     * @param refs Accumulator for collected references.
     */
    private collectFromClassLike(node: any, refs: NameReferenceType[]): void {
        this.collectAttributeGroups(node.attrGroups, refs);

        // class extends single name; interface extends array of names
        if (node.extends) {
            this.collect(node.extends, "oop", refs);
        }
        if (node.implements) {
            this.collect(node.implements, "oop", refs);
        }
        this.collect(node.body, "generic", refs);
    }

    /**
     * Collects OOP references from a type node, handling union, intersection, and nullable types.
     * @param typeNode The type node from a parameter, return type, or property declaration.
     * @param refs Accumulator for collected references.
     */
    private collectFromType(typeNode: any, refs: NameReferenceType[]): void {
        if (!typeNode) {
            return;
        }
        switch (typeNode.kind) {
            case "name":
                this.addNameRef(typeNode, "oop", refs);
                break;
            case "uniontype":
            case "intersectiontype":
                this.collect(typeNode.types, "oop", refs);
                break;
            case "nullabletype":
                this.collectFromType(typeNode.type, refs);
                break;
        }
    }

    /**
     * Collects OOP references from all attribute groups attached to a node.
     * @param attrGroups The attrgroup array from a PHP AST node.
     * @param refs Accumulator for collected references.
     */
    private collectAttributeGroups(attrGroups: any, refs: NameReferenceType[]): void {
        if (!Array.isArray(attrGroups)) {
            return;
        }

        for (const attrGroup of attrGroups) {
            this.collectFromAttrGroup(attrGroup, refs);
        }
    }

    /**
     * Collects OOP references from PHP 8+ attribute groups.
     * Attribute names are plain strings (not name AST nodes), so loc is reconstructed from
     * the attribute node's start offset and the name string length.
     * @param node The attrgroup node.
     * @param refs Accumulator for collected references.
     */
    private collectFromAttrGroup(node: any, refs: NameReferenceType[]): void {
        if (!Array.isArray(node.attrs)) {
            return;
        }

        const groupStart = typeof node.loc?.start?.offset === "number" ? node.loc.start.offset : 0;
        let searchOffset = groupStart;

        for (const attr of node.attrs) {
            if (typeof attr.name !== "string" || !attr.name) {
                continue;
            }

            const loc = this.getAttributeNameLoc(attr.name, searchOffset);
            searchOffset = loc?.end ?? searchOffset;

            if (loc) {
                refs.push({
                    name: attr.name,
                    kind: IdentifierKindEnum.Oop,
                    resolution: this.resolveAttributeNameResolution(attr.name),
                    loc,
                });
            }

            this.collect(attr.args, "generic", refs);
        }
    }

    /**
     * Generically recurses into all child properties of a node, skipping `kind` and `loc`.
     * Used as the default case when no specific traversal logic applies.
     * @param node The AST node to recurse into.
     * @param context The current traversal context to propagate.
     * @param refs Accumulator for collected references.
     */
    private collectChildren(node: any, context: TraversalContext, refs: NameReferenceType[]): void {
        for (const [key, value] of Object.entries(node)) {
            if (key === "kind" || key === "loc") {
                continue;
            }
            if (value && typeof value === "object") {
                this.collect(value as any, context, refs);
            }
        }
    }

    /**
     * Creates and pushes a NameReferenceType from a `name` AST node.
     * Skips built-in PHP types in OOP context. Maps traversal context to IdentifierKindEnum.
     * @param nameNode The `name` AST node.
     * @param context The current traversal context.
     * @param refs Accumulator for collected references.
     */
    private addNameRef(nameNode: any, context: TraversalContext, refs: NameReferenceType[]): void {
        if (!nameNode?.loc || !nameNode.name) {
            return;
        }

        const resolution = nameNode.resolution as NameResolutionEnum;
        if (!resolution) {
            return;
        }

        const name: string = nameNode.name;

        // PHP built-in type names are not user-defined references
        if (context === "oop" && PhpAstTraverser.builtInTypes.has(name.toLowerCase())) {
            return;
        }

        const kind = context === "function" ? IdentifierKindEnum.Function : context === "oop" ? IdentifierKindEnum.Oop : IdentifierKindEnum.Constant;

        refs.push({
            name,
            kind,
            resolution,
            // For FQN: both loc.start.offset and nameNode.name include the leading \
            // e.g. nameNode.name = "\\App\\Foo" for \App\Foo
            // Use name.length for end instead of loc.end.offset — standalone expression
            // statements include the trailing ";" in loc.end (php-parser quirk)
            loc: {
                start: nameNode.loc.start.offset,
                end: nameNode.loc.start.offset + name.length,
            },
        });
    }

    /**
     * Resolves the parser-independent name resolution for an attribute name string.
     * @param name The raw attribute name from php-parser.
     * @returns The matching name resolution enum.
     */
    private resolveAttributeNameResolution(name: string): NameResolutionEnum {
        if (name.startsWith("\\")) {
            return NameResolutionEnum.Fqn;
        }

        if (name.includes("\\")) {
            return NameResolutionEnum.Qn;
        }

        return NameResolutionEnum.Uqn;
    }

    /**
     * Reconstructs the source offsets of an attribute name inside a `#[...]` group.
     * php-parser reports unusable `attribute.loc` offsets at runtime, so the name token
     * is located directly in the original source code.
     * @param attrName The raw attribute name.
     * @param searchOffset The earliest source offset to search from.
     * @returns The reconstructed offset range or null if not found.
     */
    private getAttributeNameLoc(attrName: string, searchOffset: number): NameReferenceType["loc"] | null {
        if (!this.sourceCode || !attrName) {
            return null;
        }

        let candidate = this.sourceCode.indexOf(attrName, searchOffset);
        while (candidate !== -1) {
            const start = candidate;
            const end = start + attrName.length;
            const previous = this.getPreviousNonWhitespaceChar(start);
            const next = this.getNextNonWhitespaceChar(end);

            const hasValidPrefix = previous === "[" || previous === ",";
            const hasValidSuffix = next === "(" || next === "]" || next === ",";

            if (hasValidPrefix && hasValidSuffix) {
                return { start, end };
            }

            candidate = this.sourceCode.indexOf(attrName, candidate + 1);
        }

        return null;
    }

    /**
     * Finds the previous non-whitespace character before a source offset.
     * @param offset The source offset to inspect.
     * @returns The previous non-whitespace character, or null if none exists.
     */
    private getPreviousNonWhitespaceChar(offset: number): string | null {
        for (let index = offset - 1; index >= 0; index--) {
            const character = this.sourceCode[index];
            if (!/\s/u.test(character)) {
                return character;
            }
        }

        return null;
    }

    /**
     * Finds the next non-whitespace character after a source offset.
     * @param offset The source offset to inspect.
     * @returns The next non-whitespace character, or null if none exists.
     */
    private getNextNonWhitespaceChar(offset: number): string | null {
        for (let index = offset; index < this.sourceCode.length; index++) {
            const character = this.sourceCode[index];
            if (!/\s/u.test(character)) {
                return character;
            }
        }

        return null;
    }
}
