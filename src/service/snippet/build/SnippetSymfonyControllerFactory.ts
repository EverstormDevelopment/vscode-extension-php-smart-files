import { convertToSnakeCase } from "../../../utils/string/convertToSnakeCase";
import { SnippetFactoryAbstract } from "./SnippetFactoryAbstract";

/**
 * Factory class for generating Symfony controller code snippets.
 * Extends the abstract snippet factory to provide specific implementation
 * for Symfony controller generation with proper structure and syntax.
 */
export class SnippetSymfonyControllerFactory extends SnippetFactoryAbstract {
    /**
     * Creates the opening part of the class declaration with proper Symfony controller inheritance.
     * @param identifier - The name of the controller class
     * @returns The current instance for method chaining
     */
    protected openDeclaration(identifier?: string): this {
        this.snippet.appendText(`final class ${identifier} extends AbstractController\n{\n`);
        return this;
    }

    /**
     * Adds the closing bracket for the class declaration.
     * @returns The current instance for method chaining
     */
    protected closeDeclaration(): this {
        this.snippet.appendText(`}\n`);
        return this;
    }

    /**
     * Adds required Symfony use statements for controller functionality.
     * Includes AbstractController, Response, and Route attribute.
     * @returns The current instance for method chaining
     */
    protected addUseStatements(): this {
        this.snippet.appendText("use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;\n");
        this.snippet.appendText("use Symfony\\Component\\HttpFoundation\\Response;\n");
        this.snippet.appendText("use Symfony\\Component\\Routing\\Attribute\\Route;\n");
        this.snippet.appendText("\n");
        return this;
    }

    /**
     * Adds the main content of the controller by adding the route attribute and method.
     * @param identifier - The name of the controller class
     * @returns The current instance for method chaining
     */
    protected addContent(identifier?: string): this {
        return this.addAttibute().addMethod(identifier);
    }

    /**
     * Adds a Symfony Route attribute with configurable path and route name.
     * @returns The current instance for method chaining
     */
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

    /**
     * Adds a controller action method with appropriate parameters and return type.
     * Creates a render statement with template path based on the controller name.
     * @param identifier - The name of the controller class
     * @returns The current instance for method chaining
     */
    protected addMethod(identifier?: string): this {
        identifier ??= "MyController";
        const baseIdentifier = identifier.replace(/Controller$/, "");
        const snakeCaseIdentifier = convertToSnakeCase(baseIdentifier);
        const functioNameTabstop = this.tabstop++;

        this.addIndentation();
        this.snippet.appendText("public function ");
        this.snippet.appendPlaceholder("index", functioNameTabstop);
        this.snippet.appendText("(");
        this.snippet.appendTabstop(this.tabstop++);
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
