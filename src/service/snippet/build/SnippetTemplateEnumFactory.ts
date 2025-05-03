import { SnippetEnumFactory } from "./SnippetEnumFactory";

export class SnippetTemplateEnumFactory extends SnippetEnumFactory {
    protected openDeclaration(identifier?: string): this {
        this.snippet.appendText(`enum ${identifier}: `);
        this.snippet.appendPlaceholder(`string`, this.tabstop++);
        this.snippet.appendText(`\n{\n`);
        return this;
    }

    /**
     * Adds a tabstop for a method inside the class declaration
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.snippet.appendText("    ");
        this.snippet.appendText("case ");
        this.snippet.appendPlaceholder("caseName", this.tabstop++);
        this.snippet.appendText(" = '");
        this.snippet.appendPlaceholder("caseValue", this.tabstop++);
        this.snippet.appendText("';\n");
        return this;
    }
}
