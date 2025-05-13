import { SnippetFactoryAbstract } from "./SnippetFactoryAbstract";

/**
 * Factory for generating Symfony form type code snippets.
 * Creates structured form type classes following Symfony conventions with
 * proper form builder setup and options configuration.
 */
export class SnippetSymfonyFormFactory extends SnippetFactoryAbstract {
    /**
     * Creates the opening part of the form type class declaration.
     * Sets default class name if not provided and extends AbstractType.
     * @param identifier - The name of the form type class
     * @returns The current instance for method chaining
     */
    protected openDeclaration(identifier?: string): this {
        identifier ??= "MyFormType";
        this.snippet.appendText(`class ${identifier} extends AbstractType\n{\n`);
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
     * Adds required Symfony use statements for form type functionality.
     * Includes imports for AbstractType, FormBuilderInterface, and OptionsResolver.
     * @returns The current instance for method chaining
     */
    protected addUseStatements(): this {
        this.snippet.appendText("use Symfony\\Component\\Form\\AbstractType;\n");
        this.snippet.appendText("use Symfony\\Component\\Form\\FormBuilderInterface;\n");
        this.snippet.appendText("use Symfony\\Component\\OptionsResolver\\OptionsResolver;\n");
        this.snippet.appendText("\n");
        return this;
    }

    /**
     * Adds the main content of the form type class.
     * Chains together buildForm and configureOptions method generations.
     * @param identifier - Optional form type class identifier
     * @returns The current instance for method chaining
     */
    protected addContent(identifier?: string): this {
        return this.addBuildForm().addConfigureOptions();
    }

    /**
     * Adds the buildForm method required for Symfony form types.
     * Creates a basic form builder structure with a placeholder for the first field.
     * @returns The current instance for method chaining
     */
    protected addBuildForm(): this {
        this.addIndentation();
        this.snippet.appendText("public function buildForm(FormBuilderInterface $builder, array $options): void\n");
        this.addIndentation();
        this.snippet.appendText("{\n");

        this.addIndentation(2);
        this.snippet.appendText("$builder\n");
        this.addIndentation(3);
        this.snippet.appendText("->add('");
        this.snippet.appendPlaceholder("field_name", this.tabstop++);
        this.snippet.appendText("')");
        this.snippet.appendPlaceholder("", this.tabstop++);
        this.snippet.appendText("\n");
        this.addIndentation(2);
        this.snippet.appendText(";\n");
        this.addIndentation();
        this.snippet.appendText("}\n\n");
        return this;
    }

    /**
     * Adds the configureOptions method for form configuration.
     * Sets up the resolver with default options and a placeholder comment.
     * @returns The current instance for method chaining
     */
    protected addConfigureOptions(): this {
        this.addIndentation();
        this.snippet.appendText("public function configureOptions(OptionsResolver $resolver): void\n");
        this.addIndentation();
        this.snippet.appendText("{\n");
        this.addIndentation(2);
        this.snippet.appendText("$resolver->setDefaults([\n");
        this.addIndentation(3);
        this.snippet.appendPlaceholder("// Configure your form options here", this.tabstop++);
        this.snippet.appendText("\n");
        this.addIndentation(2);
        this.snippet.appendText("]);\n");
        this.addIndentation();
        this.snippet.appendText("}\n");
        return this;
    }
}
