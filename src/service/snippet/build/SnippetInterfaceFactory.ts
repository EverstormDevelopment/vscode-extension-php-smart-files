import { SnippetFactoryAbstract } from "./SnippetFactoryAbstract";

/**
 * Factory for creating PHP interface snippets.
 */
export class SnippetInterfaceFactory extends SnippetFactoryAbstract {
    /**
     * Opens an interface declaration block with the given identifier
     * @param identifier - The name of the PHP interface
     * @returns This instance for method chaining
     */
    protected openDeclaration(identifier?: string): this {
        this.snippet.appendText(`interface ${identifier}\n{\n`);
        return this;
    }

    /**
     * Closes the interface declaration block
     * @returns This instance for method chaining
     */
    protected closeDeclaration(): this {
        this.snippet.appendText(`}\n`);
        return this;
    }

    /**
     * Adds a tabstop for method declarations inside the interface
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.addIndentation();
        this.snippet.appendTabstop(this.tabstop++);
        this.snippet.appendText("\n");
        return this;
    }
}
