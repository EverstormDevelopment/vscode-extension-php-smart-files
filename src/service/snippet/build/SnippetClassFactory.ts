import { SnippetFactoryAbstract } from "./SnippetFactoryAbstract";

/**
 * Factory for creating PHP class snippets.
 */
export class SnippetClassFactory extends SnippetFactoryAbstract {
    /**
     * Opens a class declaration block with the given identifier
     * @param identifier - The name of the PHP class
     * @returns This instance for method chaining
     */
    protected openDeclaration(identifier?: string): this {
        this.snippet.appendText(`class ${identifier}\n{\n`);
        return this;
    }

    /**
     * Closes the class declaration block
     * @returns This instance for method chaining
     */
    protected closeDeclaration(): this {
        this.snippet.appendText(`}\n`);
        return this;
    }

    /**
     * Adds a tabstop for a method inside the class declaration
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.addIndentation();
        this.snippet.appendTabstop(this.tabstop++);
        this.snippet.appendText("\n");
        return this;
    }
}
