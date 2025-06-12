import { SnippetFunctionFactory } from "./SnippetFunctionFactory";


export class SnippetTemplateFunctionFactory extends SnippetFunctionFactory {
    protected addFunctionSignature(identifier: string): this {
        this.snippet.appendText(`function `);
        this.addFunctionIdentifier(identifier, true);
        this.snippet.appendText(`(`);
        this.snippet.appendTabstop(this.tabstop++);
        this.snippet.appendText(`): `);
        this.snippet.appendPlaceholder(`void`, this.tabstop++);
        this.snippet.appendText(`\n{\n`);
        return this;
    }
}
