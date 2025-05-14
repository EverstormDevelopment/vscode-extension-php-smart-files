import { SnippetFactoryAbstract } from "./SnippetFactoryAbstract";

/**
 * Factory for generating Symfony command code snippets.
 * Creates structured command classes following Symfony conventions with proper
 * command attributes, constructor, configuration, and execution methods.
 */
export class SnippetSymfonyCommandFactory extends SnippetFactoryAbstract {
    /**
     * Creates the opening part of the command class with proper attributes and declaration.
     * @param identifier - The name of the command class
     * @returns The current instance for method chaining
     */
    protected openDeclaration(identifier?: string): this {
        identifier ??= "MyCommand";
        return this.addClassAttribute(identifier).addClassDeclaration(identifier);
    }

    /**
     * Adds the AsCommand attribute to the class with name and description placeholders.
     * Formats the command name from the class identifier by removing any "Command" suffix.
     * @param identifier - The name of the command class
     * @returns The current instance for method chaining
     */
    private addClassAttribute(identifier: string): this {
        const baseIdentifier = identifier.replace(/Command$/, "");

        this.snippet.appendText("#[AsCommand(\n");
        this.addIndentation();
        this.snippet.appendText("name: '");
        this.snippet.appendPlaceholder(baseIdentifier, this.tabstop++);
        this.snippet.appendText("',\n");
        this.addIndentation();
        this.snippet.appendText("description: '");
        this.snippet.appendPlaceholder("Add a short description for your command", this.tabstop++);
        this.snippet.appendText("',\n");
        this.snippet.appendText(")]\n");

        return this;
    }

    /**
     * Generates the class declaration line extending the Symfony Command class.
     * @param identifier - The name of the command class
     * @returns The current instance for method chaining
     */
    private addClassDeclaration(identifier: string): this {
        this.snippet.appendText(`class ${identifier} extends Command\n{\n`);
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
     * Adds required Symfony use statements for command functionality.
     * Includes imports for AsCommand attribute, Command base class,
     * input/output interfaces, and SymfonyStyle helper.
     * @returns The current instance for method chaining
     */
    protected addUseStatements(): this {
        this.snippet.appendText("use Symfony\\Component\\Console\\Attribute\\AsCommand;\n");
        this.snippet.appendText("use Symfony\\Component\\Console\\Command\\Command;\n");
        this.snippet.appendText("use Symfony\\Component\\Console\\Input\\InputArgument;\n");
        this.snippet.appendText("use Symfony\\Component\\Console\\Input\\InputInterface;\n");
        this.snippet.appendText("use Symfony\\Component\\Console\\Input\\InputOption;\n");
        this.snippet.appendText("use Symfony\\Component\\Console\\Output\\OutputInterface;\n");
        this.snippet.appendText("use Symfony\\Component\\Console\\Style\\SymfonyStyle;\n");
        this.snippet.appendText("\n");
        return this;
    }

    /**
     * Adds the main content of the command class.
     * Chains together constructor, configuration, and execute method generations.
     * @param identifier - Optional command class identifier
     * @returns The current instance for method chaining
     */
    protected addContent(identifier?: string): this {
        return this.addConstructor().addConfiguration().addExecute();
    }

    /**
     * Adds a constructor method to the command class.
     * Includes placeholder for dependencies and parent constructor call.
     * @returns The current instance for method chaining
     */
    protected addConstructor(): this {
        this.addIndentation();
        this.snippet.appendText("public function __construct(");
        this.snippet.appendTabstop(this.tabstop++);
        this.snippet.appendText(")");
        this.snippet.appendText("\n");
        this.addIndentation();
        this.snippet.appendText("{\n");
        this.addIndentation(2);
        this.snippet.appendText("parent::__construct();");
        this.snippet.appendText("\n");
        this.addIndentation();
        this.snippet.appendText("}\n");
        return this;
    }

    /**
     * Adds the configure method to set up command arguments and options.
     * Includes example argument and option definitions following Symfony conventions.
     * @returns The current instance for method chaining
     */
    protected addConfiguration(): this {
        this.addIndentation();
        this.snippet.appendText("public function configure(): void\n");
        this.addIndentation();
        this.snippet.appendText("{\n");

        this.addIndentation(2);
        this.snippet.appendText("$this\n");
        this.addIndentation(3);
        this.snippet.appendText("->addArgument('arg1', InputArgument::OPTIONAL, 'Argument description')\n");
        this.addIndentation(3);
        this.snippet.appendText("->addOption('option1', null, InputOption::VALUE_NONE, 'Option description')\n");
        this.addIndentation(2);
        this.snippet.appendText(";\n");
        this.addIndentation();
        this.snippet.appendText("}\n\n");
        return this;
    }

    /**
     * Adds the execute method that contains the command's logic.
     * @returns The current instance for method chaining
     */
    protected addExecute(): this {
        this.addIndentation();
        this.snippet.appendText("protected function execute(InputInterface $input, OutputInterface $output): int\n");
        this.addIndentation();
        this.snippet.appendText("{\n");
        this.addIndentation(2);
        this.snippet.appendText("$io = new SymfonyStyle($input, $output);\n");
        this.addIndentation(2);
        this.snippet.appendPlaceholder("//$arg1 = $input->getArgument('arg1');", this.tabstop++);
        this.snippet.appendText("\n");
        this.addIndentation(2);
        this.snippet.appendPlaceholder("//$option1 = $input->getOption('option1');", this.tabstop++);
        this.snippet.appendText("\n\n");
        this.addIndentation(2);
        this.snippet.appendPlaceholder("// TODO: Implement command logic", this.tabstop++);
        this.snippet.appendText("\n\n");
        this.addIndentation(2);
        this.snippet.appendText(
            "$io->success('You have a new command! Now make it your own! Pass --help to see your options.');\n\n"
        );
        this.addIndentation(2);
        this.snippet.appendText("return Command::SUCCESS;\n");
        this.addIndentation();
        this.snippet.appendText("}\n");
        return this;
    }
}
