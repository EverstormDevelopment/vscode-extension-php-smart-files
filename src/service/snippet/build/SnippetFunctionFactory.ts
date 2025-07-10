import { SnippetFactoryAbstract } from "./SnippetFactoryAbstract";

export class SnippetFunctionFactory extends SnippetFactoryAbstract {
    /**
     * Opens a function declaration block with the given identifier
     * @param identifier - The name of the PHP function
     * @returns This instance for method chaining
     */
    protected openDeclaration(identifier?: string): this {
        identifier = identifier || "myFunction";
        this.addFunctionSignature(identifier);
        return this;
    }

    /**
     * Adds the function signature to the snippet
     * @param identifier - The name of the PHP function
     * @returns This instance for method chaining
     */
    protected addFunctionSignature(identifier: string): this {
        this.snippet.appendText(`function `);
        this.addFunctionIdentifier(identifier);
        this.snippet.appendText(`()\n{\n`);
        return this;
    }

    /**
     * Adds a function identifier to the snippet
     * @param identifier - The name of the PHP function
     * @returns This instance for method chaining
     */
    protected addFunctionIdentifier(identifier: string, usePlaceholder?: boolean): this {
        const hasStartingLetter = identifier.match(/^[\p{L}]/u);
        if (!hasStartingLetter) {
            usePlaceholder
                ? this.snippet.appendPlaceholder(identifier, this.tabstop++)
                : this.snippet.appendText(identifier);
            return this;
        }

        const hasUppercaseLetter = identifier.match(/^[\p{Lu}]/u);
        const switchedCaseLetter = hasUppercaseLetter
            ? identifier.charAt(0).toLowerCase()
            : identifier.charAt(0).toUpperCase();

        const identifierAlternative = switchedCaseLetter + identifier.slice(1);
        this.snippet.appendChoice([identifier, identifierAlternative], this.tabstop++);
        return this;
    }

    /**
     * Closes the function declaration block
     * @returns This instance for method chaining
     */
    protected closeDeclaration(): this {
        this.snippet.appendText(`}\n`);
        return this;
    }

    /**
     * Adds a tabstop for a method inside the function declaration
     * @returns This instance for method chaining
     */
    protected addContent(): this {
        this.addIndentation();
        this.snippet.appendPlaceholder("// TODO: Implement function", this.tabstop++);
        this.snippet.appendText("\n");
        return this;
    }
}
