import * as vscode from "vscode";
import { assertNormalizedFileEquals, NamespaceTestWorkspace, php } from "./NamespaceTestWorkspace";

suite("Namespace Refactor Integration", () => {
    let testWorkspace: NamespaceTestWorkspace;

    suiteSetup(async () => {
        testWorkspace = new NamespaceTestWorkspace();
        await testWorkspace.initialize();
    });

    suiteTeardown(async () => {
        await testWorkspace.dispose();
    });

    setup(async () => {
        await testWorkspace.reset();
    });

    test("moves a class across namespaces and keeps external references consistent", async () => {
        // This guards the core trust promise: after a move, callers must still resolve the same class.
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Domain/User.php": php`
                <?php

                namespace App\Domain;

                class User
                {
                }
            `,
            "src/Service/Sub/LegacyHelper.php": php`
                <?php

                namespace App\Service\Sub;

                class LegacyHelper
                {
                }
            `,
            "src/Service/UserService.php": php`
                <?php

                namespace App\Service;

                use App\Domain\User;

                class UserService
                {
                    public function build(User $user): Sub\LegacyHelper
                    {
                        return new Sub\LegacyHelper();
                    }
                }
            `,
            "src/Controller/UsesService.php": php`
                <?php

                namespace App\Controller;

                use App\Service\UserService as ServiceAlias;

                class UsesService
                {
                    public function make(): \App\Service\UserService
                    {
                        return new ServiceAlias();
                    }
                }
            `,
            "src/Domain/UsesMovedService.php": php`
                <?php

                namespace App\Domain;

                class UsesMovedService
                {
                    public function make(): \App\Service\UserService
                    {
                        return new \App\Service\UserService();
                    }
                }
            `,
        });

        const namespaceRefactorService = testWorkspace.getService();
        const oldUri = testWorkspace.uri("src/Service/UserService.php");
        const newUri = testWorkspace.uri("src/Domain/UserService.php");

        await vscode.workspace.fs.createDirectory(testWorkspace.uri("src/Domain"));
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await testWorkspace.readFile(newUri),
            php`
                <?php

                namespace App\Domain;

                class UserService
                {
                    public function build(User $user): \App\Service\Sub\LegacyHelper
                    {
                        return new \App\Service\Sub\LegacyHelper();
                    }
                }
            `,
        );

        assertNormalizedFileEquals(
            await testWorkspace.readFile(testWorkspace.uri("src/Controller/UsesService.php")),
            php`
                <?php

                namespace App\Controller;

                use App\Domain\UserService as ServiceAlias;

                class UsesService
                {
                    public function make(): \App\Domain\UserService
                    {
                        return new ServiceAlias();
                    }
                }
            `,
        );

        assertNormalizedFileEquals(
            await testWorkspace.readFile(testWorkspace.uri("src/Domain/UsesMovedService.php")),
            php`
                <?php

                namespace App\Domain;

                class UsesMovedService
                {
                    public function make(): UserService
                    {
                        return new UserService();
                    }
                }
            `,
        );
    });

    test("renames a class without corrupting strings or comments in dependent files", async () => {
        // A blind refactor must not silently rewrite runtime strings or human comments.
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Domain/LegacyService.php": php`
                <?php

                namespace App\Domain;

                class LegacyService
                {
                }
            `,
            "src/Controller/RenameConsumer.php": php`
                <?php

                namespace App\Controller;

                use App\Domain\LegacyService;

                class RenameConsumer
                {
                    public function build(): LegacyService
                    {
                        $label = 'LegacyService';
                        // LegacyService should stay untouched inside this comment.
                        return new LegacyService();
                    }
                }
            `,
        });

        const namespaceRefactorService = testWorkspace.getService();
        const oldUri = testWorkspace.uri("src/Domain/LegacyService.php");
        const newUri = testWorkspace.uri("src/Domain/BetterService.php");

        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await testWorkspace.readFile(newUri),
            php`
                <?php

                namespace App\Domain;

                class BetterService
                {
                }
            `,
        );

        assertNormalizedFileEquals(
            await testWorkspace.readFile(testWorkspace.uri("src/Controller/RenameConsumer.php")),
            php`
                <?php

                namespace App\Controller;

                use App\Domain\BetterService;

                class RenameConsumer
                {
                    public function build(): BetterService
                    {
                        $label = 'LegacyService';
                        // LegacyService should stay untouched inside this comment.
                        return new BetterService();
                    }
                }
            `,
        );
    });

    test("adds imports for external functions and constants but not for ones defined in the moved file", async () => {
        // Namespace moves are especially risky when helper functions/constants would otherwise switch meaning.
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Support/ExternalHelpers.php": php`
                <?php

                namespace App\Support;

                function external_helper(): int
                {
                    return 1;
                }

                const EXTERNAL_FLAG = true;
            `,
            "src/Support/Bundle.php": php`
                <?php

                namespace App\Support;

                function local_helper(): int
                {
                    return 2;
                }

                const LOCAL_FLAG = false;

                class Bundle
                {
                    public function run(): int
                    {
                        external_helper();
                        local_helper();

                        return EXTERNAL_FLAG ? 1 : (LOCAL_FLAG ? 2 : 3);
                    }
                }
            `,
        });

        const namespaceRefactorService = testWorkspace.getService();
        const oldUri = testWorkspace.uri("src/Support/Bundle.php");
        const newUri = testWorkspace.uri("src/Service/Bundle.php");

        await vscode.workspace.fs.createDirectory(testWorkspace.uri("src/Service"));
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await testWorkspace.readFile(newUri),
            php`
                <?php

                namespace App\Service;
                use function App\Support\external_helper;

                use const App\Support\EXTERNAL_FLAG;

                function local_helper(): int
                {
                    return 2;
                }

                const LOCAL_FLAG = false;

                class Bundle
                {
                    public function run(): int
                    {
                        external_helper();
                        local_helper();

                        return EXTERNAL_FLAG ? 1 : (LOCAL_FLAG ? 2 : 3);
                    }
                }
            `,
        );
    });

    test("updates grouped imports in referencing files and keeps unrelated imports intact", async () => {
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Old/Foo.php": php`
                <?php

                namespace App\Old;

                class Foo
                {
                }
            `,
            "src/Old/Bar.php": php`
                <?php

                namespace App\Old;

                class Bar
                {
                }
            `,
            "src/Consumer/UsesGroupedImports.php": php`
                <?php

                namespace App\Consumer;

                use App\Old\{Foo, Bar};

                class UsesGroupedImports
                {
                    public function build(Foo $foo, Bar $bar): Foo
                    {
                        return $foo;
                    }
                }
            `,
        });

        const namespaceRefactorService = testWorkspace.getService();
        const oldUri = testWorkspace.uri("src/Old/Foo.php");
        const newUri = testWorkspace.uri("src/New/Foo.php");

        await vscode.workspace.fs.createDirectory(testWorkspace.uri("src/New"));
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await testWorkspace.readFile(testWorkspace.uri("src/Consumer/UsesGroupedImports.php")),
            php`
                <?php

                namespace App\Consumer;

                use App\New\Foo;
                use App\Old\Bar;

                class UsesGroupedImports
                {
                    public function build(Foo $foo, Bar $bar): Foo
                    {
                        return $foo;
                    }
                }
            `,
        );
    });

    test("updates grouped imports with aliases and nested namespace items in referencing files", async () => {
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Old/ClassB.php": php`
                <?php

                namespace App\Old;

                class ClassB
                {
                }
            `,
            "src/Old/ClassA.php": php`
                <?php

                namespace App\Old;

                class ClassA
                {
                }
            `,
            "src/Old/SubNamespace/ClassC.php": php`
                <?php

                namespace App\Old\SubNamespace;

                class ClassC
                {
                }
            `,
            "src/Consumer/UsesGroupedAliasImports.php": php`
                <?php

                namespace App\Consumer;

                use App\Old\{ClassA, ClassB as B, SubNamespace\ClassC};

                class UsesGroupedAliasImports
                {
                    public function build(B $service, ClassA $classA, ClassC $classC): B
                    {
                        return new B();
                    }
                }
            `,
        });

        const namespaceRefactorService = testWorkspace.getService();
        const oldUri = testWorkspace.uri("src/Old/ClassB.php");
        const newUri = testWorkspace.uri("src/New/ClassB.php");

        await vscode.workspace.fs.createDirectory(testWorkspace.uri("src/New"));
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await testWorkspace.readFile(testWorkspace.uri("src/Consumer/UsesGroupedAliasImports.php")),
            php`
                <?php

                namespace App\Consumer;

                use App\New\ClassB as B;
                use App\Old\ClassA;
                use App\Old\SubNamespace\ClassC;

                class UsesGroupedAliasImports
                {
                    public function build(B $service, ClassA $classA, ClassC $classC): B
                    {
                        return new B();
                    }
                }
            `,
        );
    });

    test("updates aliased imports in referencing files when a class moves", async () => {
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Legacy/ReportBuilder.php": php`
                <?php

                namespace App\Legacy;

                class ReportBuilder
                {
                }
            `,
            "src/Consumer/UsesAliasedImport.php": php`
                <?php

                namespace App\Consumer;

                use App\Legacy\ReportBuilder as BuilderAlias;

                class UsesAliasedImport
                {
                    public function make(): \App\Legacy\ReportBuilder
                    {
                        return new BuilderAlias();
                    }
                }
            `,
        });

        const namespaceRefactorService = testWorkspace.getService();
        const oldUri = testWorkspace.uri("src/Legacy/ReportBuilder.php");
        const newUri = testWorkspace.uri("src/Application/ReportBuilder.php");

        await vscode.workspace.fs.createDirectory(testWorkspace.uri("src/Application"));
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await testWorkspace.readFile(testWorkspace.uri("src/Consumer/UsesAliasedImport.php")),
            php`
                <?php

                namespace App\Consumer;

                use App\Application\ReportBuilder as BuilderAlias;

                class UsesAliasedImport
                {
                    public function make(): \App\Application\ReportBuilder
                    {
                        return new BuilderAlias();
                    }
                }
            `,
        );
    });

    test("cancels refactoring when the new file name is not a valid PHP identifier", async () => {
        // Safety first: a bad target name must not trigger cascading reference damage.
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Domain/ValidName.php": php`
                <?php

                namespace App\Domain;

                class ValidName
                {
                }
            `,
            "src/Controller/ValidNameConsumer.php": php`
                <?php

                namespace App\Controller;

                use App\Domain\ValidName;

                class ValidNameConsumer
                {
                    public function make(): ValidName
                    {
                        return new ValidName();
                    }
                }
            `,
        });

        const namespaceRefactorService = testWorkspace.getService();
        const oldUri = testWorkspace.uri("src/Domain/ValidName.php");
        const newUri = testWorkspace.uri("src/Domain/123Bad.php");

        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await testWorkspace.readFile(newUri),
            php`
                <?php

                namespace App\Domain;

                class ValidName
                {
                }
            `,
        );

        assertNormalizedFileEquals(
            await testWorkspace.readFile(testWorkspace.uri("src/Controller/ValidNameConsumer.php")),
            php`
                <?php

                namespace App\Controller;

                use App\Domain\ValidName;

                class ValidNameConsumer
                {
                    public function make(): ValidName
                    {
                        return new ValidName();
                    }
                }
            `,
        );
    });

    test("does not add imports when the moved identifier appears only in comments or strings", async () => {
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Support/LegacyNote.php": php`
                <?php

                namespace App\Support;

                class LegacyNote
                {
                }
            `,
            "src/Support/NotesOnly.php": php`
                <?php

                namespace App\Support;

                class NotesOnly
                {
                    public function describe(): string
                    {
                        $label = 'LegacyNote';

                        // LegacyNote is documented here, but not referenced in code.
                        return $label;
                    }
                }
            `,
        });

        const namespaceRefactorService = testWorkspace.getService();
        const oldUri = testWorkspace.uri("src/Support/LegacyNote.php");
        const newUri = testWorkspace.uri("src/Domain/LegacyNote.php");

        await vscode.workspace.fs.createDirectory(testWorkspace.uri("src/Domain"));
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await testWorkspace.readFile(testWorkspace.uri("src/Support/NotesOnly.php")),
            php`
                <?php

                namespace App\Support;

                class NotesOnly
                {
                    public function describe(): string
                    {
                        $label = 'LegacyNote';

                        // LegacyNote is documented here, but not referenced in code.
                        return $label;
                    }
                }
            `,
        );
    });

    test("updates attribute references and imports when a class moves across namespaces", async () => {
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Support/Attributes/AsTaggedItem.php": php`
                <?php

                namespace App\Support\Attributes;

                class AsTaggedItem
                {
                }
            `,
            "src/Support/Attributes/When.php": php`
                <?php

                namespace App\Support\Attributes;

                class When
                {
                }
            `,
            "src/Legacy/Task.php": php`
                <?php

                namespace App\Legacy;

                use App\Support\Attributes\AsTaggedItem;

                #[AsTaggedItem('diagnostics')]
                #[Attributes\When('dev')]
                class Task
                {
                }
            `,
        });

        const namespaceRefactorService = testWorkspace.getService();
        const oldUri = testWorkspace.uri("src/Legacy/Task.php");
        const newUri = testWorkspace.uri("src/NewDomain/Task.php");

        await vscode.workspace.fs.createDirectory(testWorkspace.uri("src/NewDomain"));
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await testWorkspace.readFile(newUri),
            php`
                <?php

                namespace App\NewDomain;

                use App\Support\Attributes\AsTaggedItem;

                #[AsTaggedItem('diagnostics')]
                #[\App\Legacy\Attributes\When('dev')]
                class Task
                {
                }
            `,
        );
    });

    test("adds imports for types referenced only inside PHPDoc blocks", async () => {
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Support/Result.php": php`
                <?php

                namespace App\Support;

                class Result
                {
                }
            `,
            "src/Support/Input.php": php`
                <?php

                namespace App\Support;

                class Input
                {
                }
            `,
            "src/Support/Filter.php": php`
                <?php

                namespace App\Support;

                class Filter
                {
                }
            `,
            "src/Support/Metadata.php": php`
                <?php

                namespace App\Support;

                class Metadata
                {
                }
            `,
            "src/Support/DocblockAwareService.php": php`
                <?php

                namespace App\Support;

                /**
                 * @property-read Metadata $metadata
                 */
                class DocblockAwareService
                {
                    /**
                     * @param Input $input
                     * @return Result
                     * @method Result run(Input $input, list<Filter> $filters)
                     */
                    public function describe(): string
                    {
                        return 'ready';
                    }
                }
            `,
        });

        const namespaceRefactorService = testWorkspace.getService();
        const oldUri = testWorkspace.uri("src/Support/DocblockAwareService.php");
        const newUri = testWorkspace.uri("src/Application/DocblockAwareService.php");

        await vscode.workspace.fs.createDirectory(testWorkspace.uri("src/Application"));
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await testWorkspace.readFile(newUri),
            php`
                <?php

                namespace App\Application;
                use App\Support\Filter;
                use App\Support\Input;
                use App\Support\Metadata;
                use App\Support\Result;

                /**
                 * @property-read Metadata $metadata
                 */
                class DocblockAwareService
                {
                    /**
                     * @param Input $input
                     * @return Result
                     * @method Result run(Input $input, list<Filter> $filters)
                     */
                    public function describe(): string
                    {
                        return 'ready';
                    }
                }
            `,
        );
    });

    test("skips PHPDoc-based imports when the option is disabled", async () => {
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Support/Result.php": php`
                <?php

                namespace App\Support;

                class Result
                {
                }
            `,
            "src/Support/DocblockOnlyService.php": php`
                <?php

                namespace App\Support;

                class DocblockOnlyService
                {
                    /**
                     * @return Result
                     */
                    public function describe(): string
                    {
                        return 'ready';
                    }
                }
            `,
        });

        const originalGetConfiguration = vscode.workspace.getConfiguration.bind(vscode.workspace);
        (
            vscode.workspace as typeof vscode.workspace & {
                getConfiguration: typeof vscode.workspace.getConfiguration;
            }
        ).getConfiguration = ((section?: string, scope?: vscode.ConfigurationScope) => {
            const configuration = originalGetConfiguration(section, scope);
            if (section !== "phpSmartFiles") {
                return configuration;
            }

            return {
                ...configuration,
                get<T>(key: string, defaultValue?: T): T {
                    if (key === "refactorNamespacesIncludeDocblockTypes") {
                        return false as T;
                    }

                    return configuration.get<T>(key, defaultValue as T);
                },
            };
        }) as typeof vscode.workspace.getConfiguration;

        try {
            const namespaceRefactorService = testWorkspace.getService();
            const oldUri = testWorkspace.uri("src/Support/DocblockOnlyService.php");
            const newUri = testWorkspace.uri("src/Application/DocblockOnlyService.php");

            await vscode.workspace.fs.createDirectory(testWorkspace.uri("src/Application"));
            await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
            await namespaceRefactorService.refactorFile(oldUri, newUri);
        } finally {
            (
                vscode.workspace as typeof vscode.workspace & {
                    getConfiguration: typeof vscode.workspace.getConfiguration;
                }
            ).getConfiguration = originalGetConfiguration;
        }

        assertNormalizedFileEquals(
            await testWorkspace.readFile(testWorkspace.uri("src/Application/DocblockOnlyService.php")),
            php`
                <?php

                namespace App\Application;

                class DocblockOnlyService
                {
                    /**
                     * @return Result
                     */
                    public function describe(): string
                    {
                        return 'ready';
                    }
                }
            `,
        );
    });

    test("adds imports in dependent files when a moved class is referenced only in PHPDoc", async () => {
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Remote/Button/SubClassStatic.php": php`
                <?php

                namespace App\Remote\Button;

                class SubClassStatic
                {
                    public static string $STATIC_PROPERTY = 'Some DEV static property';
                }
            `,
            "src/Remote/Button/DiagnosticsButton.php": php`
                <?php

                namespace App\Remote\Button;

                final class DiagnosticsButton
                {
                    public function someMethod(): void
                    {
                        /**
                         * @var SubClassStatic
                         */

                        dump('DiagnosticsButton::someMethod() called');
                    }
                }
            `,
        });

        const namespaceRefactorService = testWorkspace.getService();
        const oldUri = testWorkspace.uri("src/Remote/Button/SubClassStatic.php");
        const newUri = testWorkspace.uri("src/Remote/Button/SubClasses/SubClassStatic.php");

        await vscode.workspace.fs.createDirectory(testWorkspace.uri("src/Remote/Button/SubClasses"));
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await testWorkspace.readFile(testWorkspace.uri("src/Remote/Button/DiagnosticsButton.php")),
            php`
                <?php

                namespace App\Remote\Button;
                use App\Remote\Button\SubClasses\SubClassStatic;

                final class DiagnosticsButton
                {
                    public function someMethod(): void
                    {
                        /**
                         * @var SubClassStatic
                         */

                        dump('DiagnosticsButton::someMethod() called');
                    }
                }
            `,
        );
    });

    test("renames classes referenced inside attributes in dependent files", async () => {
        await testWorkspace.writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4,
            ),
            "src/Attributes/Handles.php": php`
                <?php

                namespace App\Attributes;

                class Handles
                {
                }
            `,
            "src/Domain/LegacyService.php": php`
                <?php

                namespace App\Domain;

                class LegacyService
                {
                }
            `,
            "src/Controller/AttributeConsumer.php": php`
                <?php

                namespace App\Controller;

                use App\Attributes\Handles;
                use App\Domain\LegacyService;

                #[Handles]
                #[LegacyService]
                class AttributeConsumer
                {
                    public function make(
                        #[LegacyService]
                        string $value,
                    ): void {
                    }
                }
            `,
        });

        const namespaceRefactorService = testWorkspace.getService();
        const oldUri = testWorkspace.uri("src/Domain/LegacyService.php");
        const newUri = testWorkspace.uri("src/Domain/BetterService.php");

        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await testWorkspace.readFile(testWorkspace.uri("src/Controller/AttributeConsumer.php")),
            php`
                <?php

                namespace App\Controller;

                use App\Attributes\Handles;
                use App\Domain\BetterService;

                #[Handles]
                #[BetterService]
                class AttributeConsumer
                {
                    public function make(
                        #[BetterService]
                        string $value,
                    ): void {
                    }
                }
            `,
        );
    });
});
