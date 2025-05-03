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
        this.snippet.appendText(`class ${identifier} {\n`);
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
     * Adds a sample method inside the class declaration
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.snippet.appendText("    ");
        this.snippet.appendText("public function ");
        this.snippet.appendPlaceholder("methodName", this.tabstop++);
        this.snippet.appendText("(");
        this.snippet.appendPlaceholder("", this.tabstop++);
        this.snippet.appendText("):");
        this.snippet.appendPlaceholder("void", this.tabstop++);
        this.snippet.appendText("\n");
        this.snippet.appendText("    {\n");
        this.snippet.appendText("        ");
        this.snippet.appendPlaceholder("\/\/ TODO: Implementation", this.tabstop++);
        this.snippet.appendText("\n");
        this.snippet.appendText("    }\n");
        return this;
    }
}
