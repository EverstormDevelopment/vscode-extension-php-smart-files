import { SnippetTraitFactory } from "./SnippetTraitFactory";

export class SnippetTemplateTraitFactory extends SnippetTraitFactory {
    /**
     * Adds a tabstop for a method inside the class declaration
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.snippet.appendText("    ");
        this.snippet.appendText("public function ");
        this.snippet.appendPlaceholder("methodName", this.tabstop++);
        this.snippet.appendText("(");
        this.snippet.appendPlaceholder("", this.tabstop++);
        this.snippet.appendText("): ");
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
