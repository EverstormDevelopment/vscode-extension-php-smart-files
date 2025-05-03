import { SnippetFactoryAbstract } from "./SnippetFactoryAbstract";

/**
 * Abstract factory for creating PHP file snippets.
 */
export abstract class SnippetFileFactory extends SnippetFactoryAbstract {
    /**
     * No opening declaration needed for simple PHP files
     * @param identifier - The file identifier (unused in this implementation)
     * @returns This instance for method chaining
     */
    protected openDeclaration(identifier: string): this {
        return this;
    }

    /**
     * No closing declaration needed for simple PHP files
     * @returns This instance for method chaining
     */
    protected closeDeclaration(): this {
        return this;
    }

    /**
     * Adds a tabstop placeholder as content for the PHP file
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.snippet.appendTabstop(this.tabstop++);
        this.snippet.appendText("\n");

        return this;
    }
}
