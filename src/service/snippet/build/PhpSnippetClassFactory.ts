import { PhpSnippetFactoryAbstract } from "./PhpSnippetFactoryAbstract";

export class PhpSnippetClassFactory extends PhpSnippetFactoryAbstract {
    protected openDeclaration(identifier?: string): this {
        this.snippet.appendText(`class ${identifier} {\n`);
        return this;
    }

    protected closeDeclaration(): this {
        this.snippet.appendText(`}\n`);
        return this;
    }

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
