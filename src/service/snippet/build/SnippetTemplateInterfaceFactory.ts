import { SnippetInterfaceFactory } from "./SnippetInterfaceFactory";

/**
 * Factory for creating PHP interface snippets with template content.
 */
export class SnippetTemplateInterfaceFactory extends SnippetInterfaceFactory {
    /**
     * Adds template content to the interface declaration including a method declaration
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.addIndentation();
        this.snippet.appendText("public function ");
        this.snippet.appendPlaceholder("methodName", this.tabstop++);
        this.snippet.appendText("(");
        this.snippet.appendPlaceholder("", this.tabstop++);
        this.snippet.appendText("): ");
        this.snippet.appendPlaceholder("void", this.tabstop++);
        this.snippet.appendText(";\n");
        return this;
    }
}
