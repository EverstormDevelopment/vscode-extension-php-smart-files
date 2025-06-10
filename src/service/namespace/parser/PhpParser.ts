import type {
    Program as AST,
    ConstantStatement as PhpConstantStatement,
    Declaration as PhpDeclaration,
    Namespace as PhpNamespace,
    Node as PhpNode,
} from "php-parser";
import { Engine } from "php-parser";
import { IdentifierType } from "../type/IdentifierType";
import { IdentifierKindEnum } from "../enum/IdentifierKindEnum";

/**
 * Parser for PHP code that generates the AST and extracts various information.
 */
export class PhpParser {
    /**
     * The AST (Abstract Syntax Tree) of the parsed PHP code.
     */
    private ast: AST;

    /**
     * Creates a new instance of PhpParser and parses the given PHP code.
     * @param phpCode The PHP code to parse as a string
     * @param fileName Optional file name for error reporting
     */
    constructor(phpCode: string, fileName: string = "") {
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
     * Returns all top-level declarations (classes, interfaces, enums, traits, functions, constants)
     * within the namespace node.
     * @returns Array of IdentifierType for all found declarations
     */
    public getTopLevelDeclarations(): any[] {
        const namespaceNode = this.getNamespaceNode();
        if (!namespaceNode) {
            return [];
        }

        const declarations = [];
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
            identifier: identifier,
            kind: node.kind as IdentifierKindEnum,
        };
    }
}
