import { SnippetTraitFactory } from "./SnippetTraitFactory";

/**
 * Factory for creating PHP trait snippets with template content.
 */
export class SnippetTemplateTraitFactory extends SnippetTraitFactory {
    /**
     * Adds a template method to the trait declaration with implementation placeholder
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.addIndentation();
        this.snippet.appendText("public function ");
        this.snippet.appendPlaceholder("methodName", this.tabstop++);
        this.snippet.appendText("(");
        this.snippet.appendTabstop(this.tabstop++);
        this.snippet.appendText("): ");
        this.snippet.appendPlaceholder("void", this.tabstop++);
        this.snippet.appendText("\n");
        this.addIndentation();
        this.snippet.appendText("{\n");
        this.addIndentation(2);
        this.snippet.appendPlaceholder("// TODO: Implement method", this.tabstop++);
        this.snippet.appendText("\n");
        this.addIndentation();
        this.snippet.appendText("}\n");
        return this;
    }
}
