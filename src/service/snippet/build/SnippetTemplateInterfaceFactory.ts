import { SnippetInterfaceFactory } from "./SnippetInterfaceFactory";

export class SnippetTemplateInterfaceFactory extends SnippetInterfaceFactory {
    protected addContent(): this {
        this.snippet.appendText("    ");
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
