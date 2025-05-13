import { SnippetClassFactory } from "./SnippetClassFactory";

/**
 * Factory for creating PHP class snippets with template content.
 */
export class SnippetTemplateClassFactory extends SnippetClassFactory {
    /**
     * Adds a sample template body to the snippet
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        return this.addConstructor().addLineBreak().addMethod();
    }

    /**
     * Adds a constructor method to the class with parameters and implementation placeholders
     * @returns This instance for method chaining
     */
    protected addConstructor(): this {
        this.addIndentation();
        this.snippet.appendText("public function __construct(");
        this.snippet.appendPlaceholder("", this.tabstop++);
        this.snippet.appendText(")");
        this.snippet.appendText("\n");
        this.addIndentation();
        this.snippet.appendText("{\n");
        this.addIndentation(2);
        this.snippet.appendPlaceholder("// TODO: Implementation", this.tabstop++);
        this.snippet.appendText("\n");
        this.addIndentation();
        this.snippet.appendText("}\n");
        return this;
    }

    /**
     * Adds a standard method to the class with parameters, return type, and implementation placeholders
     * @returns This instance for method chaining
     */
    protected addMethod(): this {
        this.addIndentation();
        this.snippet.appendText("public function ");
        this.snippet.appendPlaceholder("methodName", this.tabstop++);
        this.snippet.appendText("(");
        this.snippet.appendPlaceholder("", this.tabstop++);
        this.snippet.appendText("): ");
        this.snippet.appendPlaceholder("void", this.tabstop++);
        this.snippet.appendText("\n");
        this.addIndentation();
        this.snippet.appendText("{\n");
        this.addIndentation(2);
        this.snippet.appendPlaceholder("// TODO: Implementation", this.tabstop++);
        this.snippet.appendText("\n");
        this.addIndentation();
        this.snippet.appendText("}\n");
        return this;
    }
}
