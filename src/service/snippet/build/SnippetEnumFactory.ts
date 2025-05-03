import { SnippetFactoryAbstract } from "./SnippetFactoryAbstract";

export class SnippetEnumFactory extends SnippetFactoryAbstract {
    protected openDeclaration(identifier?: string): this {
        this.snippet.appendText(`enum ${identifier}\n{\n`);
        return this;
    }


    protected closeDeclaration(): this {
        this.snippet.appendText(`}\n`);
        return this;
    }

    /**
     * Adds a tabstop for a method inside the class declaration
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.snippet.appendText("    ");
        this.snippet.appendTabstop(this.tabstop++);
        this.snippet.appendText("\n");
        return this;
    }
}
