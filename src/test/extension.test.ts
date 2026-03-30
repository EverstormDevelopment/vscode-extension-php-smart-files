import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { ContainerFactory } from "../container/build/ContainerFactory";
import { NamespaceRefactorService } from "../service/namespace/service/NamespaceRefactorService";

const textDecoder = new TextDecoder("utf-8");
const textEncoder = new TextEncoder();

suite("Namespace Refactor Integration", () => {
    let workspaceRoot: vscode.Uri;
    let sandboxRoot: vscode.Uri;
    let namespaceRefactorService: NamespaceRefactorService;

    suiteSetup(async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, "A workspace folder is required for integration tests.");

        workspaceRoot = workspaceFolder.uri;
        sandboxRoot = vscode.Uri.joinPath(workspaceRoot, ".tmp-tests", "namespace-refactor-integration");
        namespaceRefactorService = ContainerFactory.getDefaultContainer().get(NamespaceRefactorService);

        await deleteIfExists(sandboxRoot);
        await vscode.workspace.fs.createDirectory(sandboxRoot);
    });

    suiteTeardown(async () => {
        await deleteIfExists(sandboxRoot);
    });

    setup(async () => {
        await deleteChildren(sandboxRoot);
    });

    test("moves a class across namespaces and keeps external references consistent", async () => {
        // This guards the core trust promise: after a move, callers must still resolve the same class.
        await writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4
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

        const oldUri = uri("src/Service/UserService.php");
        const newUri = uri("src/Domain/UserService.php");

        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(sandboxRoot, "src", "Domain"));
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await readFile(newUri),
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
            `
        );

        assertNormalizedFileEquals(
            await readFile(uri("src/Controller/UsesService.php")),
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
            `
        );

        assertNormalizedFileEquals(
            await readFile(uri("src/Domain/UsesMovedService.php")),
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
            `
        );
    });

    test("renames a class without corrupting strings or comments in dependent files", async () => {
        // A blind refactor must not silently rewrite runtime strings or human comments.
        await writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4
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

        const oldUri = uri("src/Domain/LegacyService.php");
        const newUri = uri("src/Domain/BetterService.php");

        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await readFile(newUri),
            php`
                <?php

                namespace App\Domain;

                class BetterService
                {
                }
            `
        );

        assertNormalizedFileEquals(
            await readFile(uri("src/Controller/RenameConsumer.php")),
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
            `
        );
    });

    test("adds imports for external functions and constants but not for ones defined in the moved file", async () => {
        // Namespace moves are especially risky when helper functions/constants would otherwise switch meaning.
        await writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4
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

        const oldUri = uri("src/Support/Bundle.php");
        const newUri = uri("src/Service/Bundle.php");

        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(sandboxRoot, "src", "Service"));
        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await readFile(newUri),
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
            `
        );
    });

    test("cancels refactoring when the new file name is not a valid PHP identifier", async () => {
        // Safety first: a bad target name must not trigger cascading reference damage.
        await writeWorkspaceFiles({
            "composer.json": JSON.stringify(
                {
                    autoload: {
                        "psr-4": {
                            "App\\": "src/",
                        },
                    },
                },
                null,
                4
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

        const oldUri = uri("src/Domain/ValidName.php");
        const newUri = uri("src/Domain/123Bad.php");

        await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: true });
        await namespaceRefactorService.refactorFile(oldUri, newUri);

        assertNormalizedFileEquals(
            await readFile(newUri),
            php`
                <?php

                namespace App\Domain;

                class ValidName
                {
                }
            `
        );

        assertNormalizedFileEquals(
            await readFile(uri("src/Controller/ValidNameConsumer.php")),
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
            `
        );
    });

    function uri(relativePath: string): vscode.Uri {
        const segments = relativePath.split(/[\\/]/u);
        return vscode.Uri.joinPath(sandboxRoot, ...segments);
    }

    async function writeWorkspaceFiles(files: Record<string, string>): Promise<void> {
        for (const [relativePath, content] of Object.entries(files)) {
            const fileUri = uri(relativePath);
            const directoryPath = path.posix.dirname(relativePath.replace(/\\/gu, "/"));
            if (directoryPath !== ".") {
                await vscode.workspace.fs.createDirectory(uri(directoryPath));
            }

            await vscode.workspace.fs.writeFile(fileUri, textEncoder.encode(normalizeLineEndings(content)));
        }
    }

    async function readFile(fileUri: vscode.Uri): Promise<string> {
        const content = await vscode.workspace.fs.readFile(fileUri);
        return textDecoder.decode(content);
    }

    async function deleteChildren(directoryUri: vscode.Uri): Promise<void> {
        const entries = await vscode.workspace.fs.readDirectory(directoryUri);
        for (const [name] of entries) {
            await vscode.workspace.fs.delete(vscode.Uri.joinPath(directoryUri, name), {
                recursive: true,
                useTrash: false,
            });
        }
    }

    async function deleteIfExists(targetUri: vscode.Uri): Promise<void> {
        try {
            await vscode.workspace.fs.delete(targetUri, { recursive: true, useTrash: false });
        } catch (error) {
            if (!(error instanceof vscode.FileSystemError)) {
                throw error;
            }
        }
    }
});

function php(strings: TemplateStringsArray, ...values: string[]): string {
    const raw = String.raw({ raw: strings.raw }, ...values);
    const trimmed = raw.replace(/^\n/u, "").replace(/\n\s*$/u, "\n");
    const lines = trimmed.split("\n");
    const indents = lines
        .filter((line) => line.trim().length > 0)
        .map((line) => line.match(/^ */u)?.[0].length ?? 0);
    const minIndent = indents.length > 0 ? Math.min(...indents) : 0;

    return lines.map((line) => line.slice(minIndent)).join("\n");
}

function normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/gu, "\n");
}

function assertNormalizedFileEquals(actual: string, expected: string): void {
    assert.strictEqual(normalizeLineEndings(actual), normalizeLineEndings(expected));
}
