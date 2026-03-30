import type {
    Program as AST,
    ConstantStatement as PhpConstantStatement,
    Declaration as PhpDeclaration,
    Namespace as PhpNamespace,
    Node as PhpNode,
} from "php-parser";
import { Engine } from "php-parser";
import { IdentifierKindEnum } from "../enum/IdentifierKindEnum";
import { IdentifierLocType } from "../type/IdentifierLocType";
import { IdentifierType } from "../type/IdentifierType";
import { OffsetLocType } from "../type/OffsetLocType";
import { UseStatementType } from "../type/UseStatementType";

/**
 * Parser for PHP code that generates the AST and extracts various information.
 */
export class PhpParser {
    /**
     * The AST (Abstract Syntax Tree) of the parsed PHP code.
     */
    private ast: AST;

    /**
     * The original PHP source code, stored for offset-based loc computation.
     */
    private phpCode: string;

    /**
     * Creates a new instance of PhpParser and parses the given PHP code.
     * @param phpCode The PHP code to parse as a string
     * @param fileName Optional file name for error reporting
     */
    constructor(phpCode: string, fileName: string = "") {
        this.phpCode = phpCode;
        const parser = new Engine({
            parser: {
                php7: true,
                suppressErrors: true,
            },
            ast: {
                withPositions: true,
            },
        });

        this.ast = parser.parseCode(phpCode, fileName);
    }

    /**
     * Returns the complete AST (Abstract Syntax Tree) of the parsed PHP code.
     * @returns The AST object
     */
    public getAST(): AST {
        return this.ast;
    }

    /**
     * Returns the namespace name if present in the parsed PHP code.
     * @returns The namespace name as a string or undefined if none exists
     */
    public getNamespace(): string | undefined {
        if (!this.ast || !this.ast.children) {
            return undefined;
        }

        const namespaceNode = this.getNamespaceNode();
        if (!namespaceNode) {
            return undefined;
        }

        return namespaceNode.name || undefined;
    }

    /**
     * Returns the character offset range of the namespace declaration line (e.g. `namespace App\Foo;`).
     * @returns The offset range or null if no namespace declaration is found
     */
    public getNamespaceLoc(): OffsetLocType | null {
        const namespaceNode = this.getNamespaceNode();
        if (!namespaceNode?.loc) {
            return null;
        }

        const start = namespaceNode.loc.start.offset;
        const semicolonIndex = this.phpCode.indexOf(";", start);
        if (semicolonIndex === -1) {
            return null;
        }

        return { start, end: semicolonIndex + 1 };
    }

    /**
     * Returns all top-level identifiers (classes, interfaces, enums, traits, functions, constants)
     * within the namespace node.
     * @returns Array of IdentifierType for all found identifiers
     */
    public getTopLevelIdentifiers(): IdentifierType[] {
        const namespaceNode = this.getNamespaceNode();
        if (!namespaceNode) {
            return [];
        }

        const declarations: IdentifierType[] = [];
        for (const node of namespaceNode.children) {
            switch (node.kind) {
                case IdentifierKindEnum.Class:
                case IdentifierKindEnum.Interface:
                case IdentifierKindEnum.Enum:
                case IdentifierKindEnum.Trait:
                case IdentifierKindEnum.Function:
                    const declaration = this.getDeclarationFromNode(node);
                    declarations.push(declaration);
                    break;
                case "constantstatement":
                    const constantDeclarations = this.getConstantDeclarationsFromNode(node);
                    declarations.push(...constantDeclarations);
                    break;
                default:
                    break;
            }
        }
        return declarations;
    }

    /**
     * Returns all top-level class/interface/enum/trait/function identifiers with the
     * character offset of their name token. Constants are excluded (no reliable name token loc).
     * @returns Array of IdentifierLocType for all found identifiers
     */
    public getTopLevelIdentifierLocs(): IdentifierLocType[] {
        const namespaceNode = this.getNamespaceNode();
        if (!namespaceNode) {
            return [];
        }

        const result: IdentifierLocType[] = [];
        for (const node of namespaceNode.children) {
            switch (node.kind) {
                case IdentifierKindEnum.Class:
                case IdentifierKindEnum.Interface:
                case IdentifierKindEnum.Enum:
                case IdentifierKindEnum.Trait:
                case IdentifierKindEnum.Function: {
                    const nameLoc = this.getNameTokenLoc(node);
                    if (nameLoc) {
                        result.push({ ...this.getDeclarationFromNode(node), nameLoc });
                    }
                    break;
                }
                default:
                    break;
            }
        }
        return result;
    }

    /**
     * Returns all use statements found in the namespace, with their kind, alias and source location.
     * For grouped use statements (e.g. `use App\{Bar, Baz}`), each item is returned individually
     * but shares the loc of the entire grouped statement.
     * @returns Array of UseStatementType for all found use statements
     */
    public getUseStatements(): UseStatementType[] {
        const namespaceNode = this.getNamespaceNode();
        if (!namespaceNode) {
            return [];
        }

        const result: UseStatementType[] = [];
        for (const node of namespaceNode.children) {
            if (node.kind !== "usegroup") {
                continue;
            }

            // Runtime uses .items; TypeScript types incorrectly declare .item
            const useGroup = node as any;
            const items: any[] = useGroup.items ?? [];
            const groupPrefix: string | null = useGroup.name ?? null;
            const kind = this.resolveUseStatementKind(useGroup.type);
            const locStart = useGroup.loc.start.offset;
            const locEnd = useGroup.loc.end.offset;
            const semicolonIndex = this.phpCode.indexOf(";", locEnd);
            const loc: OffsetLocType = {
                start: locStart,
                end: semicolonIndex !== -1 ? semicolonIndex + 1 : locEnd,
            };

            for (const item of items) {
                // Non-grouped: item.name is full FQN (e.g. "App\\Foo")
                // Grouped: item.name is relative (e.g. "Foo"), groupPrefix is the common part
                const name: string = groupPrefix ? `${groupPrefix}\\${item.name}` : item.name;
                const alias: string | null = item.alias?.name ?? null;
                const grouped = groupPrefix !== null;
                result.push({
                    name,
                    kind,
                    alias,
                    loc,
                    grouped,
                    groupPrefix,
                    groupLoc: loc,
                });
            }
        }

        return result;
    }

    /**
     * Searches for and returns the namespace node from the AST, if present.
     * @returns The namespace node or undefined if none exists
     */
    private getNamespaceNode(): PhpNamespace | undefined {
        if (!this.ast || !this.ast.children) {
            return undefined;
        }

        for (const node of this.ast.children) {
            if (node.kind === IdentifierKindEnum.Namespace) {
                return node as PhpNamespace;
            }
        }

        return undefined;
    }

    /**
     * Extracts the character offset of the name token from a declaration node.
     * Returns null if the name is not an AST node with a loc (e.g. plain string names).
     * @param node The declaration node
     * @returns The offset range of the name token, or null
     */
    private getNameTokenLoc(node: PhpNode): OffsetLocType | null {
        const decl = node as PhpDeclaration;
        const nameNode = decl.name;
        if (typeof nameNode === "string" || !nameNode) {
            return null;
        }
        const loc = (nameNode as any).loc;
        if (!loc) {
            return null;
        }
        return { start: loc.start.offset, end: loc.end.offset };
    }

    /**
     * Resolves the IdentifierKindEnum from a usegroup type string.
     * @param type The usegroup type string ("function", "const", or null)
     * @returns The corresponding IdentifierKindEnum value
     */
    private resolveUseStatementKind(type: string | null): IdentifierKindEnum {
        if (type === "function") {
            return IdentifierKindEnum.Function;
        }
        if (type === "const") {
            return IdentifierKindEnum.Constant;
        }
        return IdentifierKindEnum.Oop;
    }

    /**
     * Extracts all constant declarations from a ConstantStatement node.
     * @param node The ConstantStatement node
     * @returns Array of IdentifierType for each found constant
     */
    private getConstantDeclarationsFromNode(node: PhpNode): IdentifierType[] {
        const constantNode = node as PhpConstantStatement;
        const declarations: IdentifierType[] = [];

        for (const child of constantNode.constants) {
            if (child.kind === IdentifierKindEnum.Constant) {
                const declaration = this.getDeclarationFromNode(child);
                declarations.push(declaration);
            }
        }
        return declarations;
    }

    /**
     * Creates an IdentifierType object from a declaration node (e.g. class, function, constant).
     * @param node The declaration node
     * @returns IdentifierType with the name and kind of the declaration
     */
    private getDeclarationFromNode(node: PhpNode): IdentifierType {
        const declarationNode = node as PhpDeclaration;
        const identifier = typeof declarationNode.name === "string" ? declarationNode.name : declarationNode.name.name;
        return {
            name: identifier,
            kind: node.kind as IdentifierKindEnum,
        };
    }
}
