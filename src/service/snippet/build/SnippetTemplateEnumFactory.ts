import { SnippetEnumFactory } from "./SnippetEnumFactory";

/**
 * Factory for creating PHP enum snippets with template content.
 * Extends the basic enum snippet with typed enum declaration and case examples.
 */
export class SnippetTemplateEnumFactory extends SnippetEnumFactory {
    /**
     * Opens an enum declaration block with the given identifier and a type placeholder
     * @param identifier - The name of the PHP enum
     * @returns This instance for method chaining
     */
    protected openDeclaration(identifier?: string): this {
        this.snippet.appendText(`enum ${identifier}: `);
        this.snippet.appendPlaceholder(`string`, this.tabstop++);
        this.snippet.appendText(`\n{\n`);
        return this;
    }

    /**
     * Adds template content to the enum declaration including a placeholder case
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.snippet.appendText("    ");
        this.snippet.appendText("case ");
        this.snippet.appendPlaceholder("CaseName", this.tabstop++);
        this.snippet.appendText(" = '");
        this.snippet.appendPlaceholder("caseValue", this.tabstop++);
        this.snippet.appendText("';\n");
        return this;
    }
}
