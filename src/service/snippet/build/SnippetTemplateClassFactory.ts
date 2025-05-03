import { SnippetClassFactory } from "./SnippetClassFactory";


export class SnippetTemplateClassFactory extends SnippetClassFactory {
    /**
     * Adds a sample template body to the snippet
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        return this.addConstructor()
            .addLineBreak()
            .addMethod();
    }

    protected addConstructor(): this {
        this.snippet.appendText("    ");
        this.snippet.appendText("public function __construct(");
        this.snippet.appendPlaceholder("", this.tabstop++);
        this.snippet.appendText(")");
        this.snippet.appendText("\n");
        this.snippet.appendText("    {\n");
        this.snippet.appendText("        ");
        this.snippet.appendPlaceholder("\/\/ TODO: Implementation", this.tabstop++);
        this.snippet.appendText("\n");
        this.snippet.appendText("    }\n");
        return this;
    }

    protected addMethod(): this {
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
