import type {
    Program as AST,
    Node as PhpNode,
    Namespace as PhpNamespace,
    Declaration as PhpDeclaration,
    ConstantStatement as PhpConstantStatement,
} from "php-parser";
import { Engine } from "php-parser";
import { IdentifierType } from "../type/IdentifierType";

export class PhpParser {
    private ast: AST;

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

    public getAST(): AST {
        return this.ast;
    }

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

    public getTopLevelDeclarations(): any[] {
        const namespaceNode = this.getNamespaceNode();
        if (!namespaceNode) {
            return [];
        }

        const declarations = [];
        for (const node of namespaceNode.children) {
            switch (node.kind) {
                case "class":
                case "interface":
                case "enum":
                case "trait":
                case "function":
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

    private getNamespaceNode(): PhpNamespace | undefined {
        if (!this.ast || !this.ast.children) {
            return undefined;
        }

        for (const node of this.ast.children) {
            if (node.kind === "namespace") {
                return node as PhpNamespace;
            }
        }

        return undefined;
    }

    private getConstantDeclarationsFromNode(node: PhpNode): IdentifierType[] {
        const constantNode = node as PhpConstantStatement;
        const declarations: IdentifierType[] = [];

        for (const child of constantNode.constants) {
            if (child.kind === "constant") {
                const declaration = this.getDeclarationFromNode(child);
                declarations.push(declaration);
            }
        }
        return declarations;
    }

    private getDeclarationFromNode(node: PhpNode): IdentifierType {
        const declarationNode = node as PhpDeclaration;
        const identifier = typeof declarationNode.name === "string" ? declarationNode.name : declarationNode.name.name;
        return {
            identifier: identifier,
            type: node.kind,
        };
    }
}
