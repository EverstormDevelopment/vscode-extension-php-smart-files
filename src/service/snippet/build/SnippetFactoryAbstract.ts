import * as vscode from "vscode";
import { SnippetTypeFactoryInterface } from "../interface/SnippetTypeFactoryInterface";

/**
 * Abstract base class for PHP snippet factories.
 */
export abstract class SnippetFactoryAbstract implements SnippetTypeFactoryInterface {
    /**
     * Current tab stop index for placeholders in the snippet
     */
    protected tabstop: number;

    /**
     * The snippet string being built
     */
    protected snippet: vscode.SnippetString;

    /**
     * Initializes a new instance of the PhpSnippetFactoryAbstract class
     */
    constructor() {
        this.tabstop = 1;
        this.snippet = new vscode.SnippetString();
    }

    /**
     * Creates a PHP code snippet for the given identifier and namespace
     * @param identifier - The name of the PHP definition
     * @param namespace - Optional namespace for the PHP definition
     * @returns A VS Code snippet string
     */
    public create(identifier: string, namespace?: string): vscode.SnippetString {
        return this.createSnippet()
            .addPhpTag()
            .addStrictType()
            .addLineBreak()
            .addNamespace(namespace)
            .addUseStatements(identifier, namespace)
            .openDeclaration(identifier, namespace)
            .addContent(identifier, namespace)
            .closeDeclaration()
            .getSnippet();
    }

    /**
     * Creates a new snippet instance
     * @returns This instance for method chaining
     */
    private createSnippet(): this {
        this.snippet = new vscode.SnippetString();
        return this;
    }

    /**
     * Adds the PHP opening tag to the snippet
     * @returns This instance for method chaining
     */
    private addPhpTag(): this {
        this.snippet.appendText("<?php\n");
        return this;
    }

    /**
     * Adds strict type declaration if enabled in settings
     * @returns This instance for method chaining
     */
    private addStrictType(): this {
        const config = vscode.workspace.getConfiguration("phpSmartFiles");
        const useStrictType = config.get<boolean>("useStrictTypeInTemplates", false);
        if (!useStrictType) {
            return this;
        }

        this.snippet.appendText("declare(strict_types=1);\n");
        return this;
    }

    /**
     * Adds a namespace declaration to the snippet
     * @param namespace - The namespace to add, undefined to skip
     * @returns This instance for method chaining
     */
    private addNamespace(namespace?: string): this {
        if (!namespace) {
            return this;
        }

        this.snippet.appendText(`namespace ${namespace};\n\n`);
        return this;
    }

    /**
     * Adds use statements to the snippet
     * @param identifier - The name of the PHP definition
     * @param namespace - The namespace of the PHP definition
     * @returns This instance for method chaining
     */
    protected addUseStatements(identifier?: string, namespace?: string): this {
        return this;
    }

    /**
     * Adds a line break to the snippet
     * @returns This instance for method chaining
     */
    protected addLineBreak(): this {
        this.snippet.appendText("\n");
        return this;
    }

    /**
     * Adds indentation to the snippet
     * @param amount - The number of indentation levels to add
     * @returns This instance for method chaining
     */
    protected addIndentation(amount: number = 1): this {
        for (let i = 0; i < amount; i++) {
            this.snippet.appendText("    ");
        }
        return this;
    }

    /**
     * Returns the completed snippet
     * @returns The VS Code snippet string
     */
    protected getSnippet(): vscode.SnippetString {
        return this.snippet;
    }

    /**
     * Opens the declaration block for the PHP definition
     * @param identifier - The name of the PHP definition
     * @param namespace - The namespace of the PHP definition
     * @returns This instance for method chaining
     */
    protected abstract openDeclaration(identifier?: string, namespace?: string): this;

    /**
     * Closes the declaration block for the PHP definition
     * @param identifier - The name of the PHP definition
     * @param namespace - The namespace of the PHP definition
     * @returns This instance for method chaining
     */
    protected abstract closeDeclaration(identifier?: string, namespace?: string): this;

    /**
     * Adds content to the snippet, such as methods or properties
     * @param identifier - The name of the PHP definition
     * @param namespace - The namespace of the PHP definition
     * @returns This instance for method chaining
     */
    protected abstract addContent(identifier?: string, namespace?: string): this;
}
