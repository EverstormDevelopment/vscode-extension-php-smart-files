import * as vscode from "vscode";
import { PhpSnippetTypeFactoryInterface } from "../interface/PhpSnippetTypeFactoryInterface";

export abstract class PhpSnippetFactoryAbstract implements PhpSnippetTypeFactoryInterface {
    protected tabstop: number;

    protected snippet: vscode.SnippetString;

    constructor() {
        this.tabstop = 1;
        this.snippet = new vscode.SnippetString();
    }

    public create(identifier: string, namespace?: string): vscode.SnippetString {
        return this.createSnippet()
            .addPhpTag()
            .addNamespace(namespace)
            .openDeclaration(identifier)
            .addContent()
            .closeDeclaration()
            .getSnippet();
    }

    private createSnippet(): this {
        this.snippet = new vscode.SnippetString();
        return this;
    }

    private addPhpTag(): this {
        this.snippet.appendText("<?php\n\n");
        return this;
    }

    private addNamespace(namespace: string | undefined): this {
        if (namespace === undefined) {
            return this;
        }

        if (namespace) {
            this.snippet.appendText(`namespace ${namespace};\n\n`);
            return this;
        }

        this.snippet.appendText("namespace ");
        this.snippet.appendPlaceholder("App", this.tabstop++);
        this.snippet.appendText(";\n\n");
        return this;
    }

    protected getSnippet(): vscode.SnippetString {
        return this.snippet;
    }

    protected abstract openDeclaration(identifier: string): this;

    protected abstract closeDeclaration(): this;

    protected abstract addContent(): this;
}
