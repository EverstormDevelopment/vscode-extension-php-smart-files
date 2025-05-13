import { convertToSnakeCase } from "../../../utils/string/convertToSnakeCase";
import { SnippetFactoryAbstract } from "./SnippetFactoryAbstract";

/**
 * Factory for creating PHP class snippets with template content.
 */
export class SnippetSymfonyControllerFactory extends SnippetFactoryAbstract {
    /**
     * Adds the opening declaration for a Symfony controller class
     * @param identifier - The name of the controller class
     * @returns This instance for method chaining
     */
    protected openDeclaration(identifier?: string): this {
        this.snippet.appendText(`final class ${identifier} extends AbstractController\n{\n`);
        return this;
    }

    /**
     * Closes the class declaration block
     * @returns This instance for method chaining
     */
    protected closeDeclaration(): this {
        this.snippet.appendText(`}\n`);
        return this;
    }

    protected addUseStatements(): this {
        this.snippet.appendText("use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;\n");
        this.snippet.appendText("use Symfony\\Component\\HttpFoundation\\Response;\n");
        this.snippet.appendText("use Symfony\\Component\\Routing\\Attribute\\Route;\n");
        this.snippet.appendText("\n");
        return this;
    }

    protected addContent(identifier?: string): this {
        return this.addAttibute().addMethod(identifier);
    }

    protected addAttibute(): this {
        this.addIndentation();
        this.snippet.appendText("#[Route('");
        this.snippet.appendPlaceholder("/path", this.tabstop++);
        this.snippet.appendText("', name: '");
        this.snippet.appendPlaceholder("route_name", this.tabstop++);
        this.snippet.appendText("')]");
        this.snippet.appendText("\n");
        return this;
    }

    protected addMethod(identifier?: string): this {
        identifier ??= "MyController";
        const baseIdentifier = identifier.replace(/Controller$/, '');
        const snakeCaseIdentifier = convertToSnakeCase(baseIdentifier);
        const functioNameTabstop = this.tabstop++;

        this.addIndentation();
        this.snippet.appendText("public function ");
        this.snippet.appendPlaceholder("index", functioNameTabstop);
        this.snippet.appendText("(");
        this.snippet.appendPlaceholder("", this.tabstop++);
        this.snippet.appendText("): ");
        this.snippet.appendPlaceholder("Response", this.tabstop++);
        this.snippet.appendText("\n");
        this.addIndentation();
        this.snippet.appendText("{\n");
        this.addIndentation(2);
        this.snippet.appendText("return $this->render('");
        this.snippet.appendPlaceholder(snakeCaseIdentifier, this.tabstop++);
        this.snippet.appendText("/");
        this.snippet.appendPlaceholder("index", functioNameTabstop);
        this.snippet.appendText(".html.twig', [\n");
        this.addIndentation(3);
        this.snippet.appendText("'");
        this.snippet.appendPlaceholder("controller_name", this.tabstop++);
        this.snippet.appendText("' => '");
        this.snippet.appendPlaceholder(identifier, this.tabstop++);
        this.snippet.appendText("'\n");
        this.addIndentation(2);
        this.snippet.appendText("]);\n");
        this.addIndentation();
        this.snippet.appendText("}\n");
        return this;
    }
}
