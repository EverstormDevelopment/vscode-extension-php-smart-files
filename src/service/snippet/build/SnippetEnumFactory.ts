import { SnippetFactoryAbstract } from "./SnippetFactoryAbstract";

/**
 * Factory for creating PHP enum snippets.
 */
export class SnippetEnumFactory extends SnippetFactoryAbstract {
    /**
     * Opens an enum declaration block with the given identifier
     * @param identifier - The name of the PHP enum
     * @returns This instance for method chaining
     */
    protected openDeclaration(identifier?: string): this {
        this.snippet.appendText(`enum ${identifier}\n{\n`);
        return this;
    }

    /**
     * Closes the enum declaration block
     * @returns This instance for method chaining
     */
    protected closeDeclaration(): this {
        this.snippet.appendText(`}\n`);
        return this;
    }

    /**
     * Adds a tabstop for enum case declarations
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.addIndentation();
        this.snippet.appendTabstop(this.tabstop++);
        this.snippet.appendText("\n");
        return this;
    }
}
