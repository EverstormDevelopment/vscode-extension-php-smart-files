import { PhpSnippetFactoryAbstract } from "./PhpSnippetFactoryAbstract";

export abstract class PhpSnippetFileFactory extends PhpSnippetFactoryAbstract {
    protected openDeclaration(identifier: string): this {
        return this;
    }

    protected closeDeclaration(): this {
        return this;
    }

    protected addContent(): this {
        this.snippet.appendTabstop(this.tabstop++);
        this.snippet.appendText("\n");

        return this;
    }
}
