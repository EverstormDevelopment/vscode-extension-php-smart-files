import { SnippetFactoryAbstract } from "./SnippetFactoryAbstract";

/**
 * Factory for creating PHP trait snippets.
 */
export class SnippetTraitFactory extends SnippetFactoryAbstract {
    /**
     * Opens a trait declaration block with the given identifier
     * @param identifier - The name of the PHP trait
     * @returns This instance for method chaining
     */
    protected openDeclaration(identifier?: string): this {
        this.snippet.appendText(`trait ${identifier}\n{\n`);
        return this;
    }

    /**
     * Closes the trait declaration block
     * @returns This instance for method chaining
     */
    protected closeDeclaration(): this {
        this.snippet.appendText(`}\n`);
        return this;
    }

    /**
     * Adds a tabstop for a method inside the trait declaration
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.snippet.appendText("    ");
        this.snippet.appendTabstop(this.tabstop++);
        this.snippet.appendText("\n");
        return this;
    }
}
