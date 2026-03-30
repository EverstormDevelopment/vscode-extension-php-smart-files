import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { ContainerFactory } from "../container/build/ContainerFactory";
import { NamespaceRefactorService } from "../service/namespace/service/NamespaceRefactorService";

const textDecoder = new TextDecoder("utf-8");
const textEncoder = new TextEncoder();

export class NamespaceTestWorkspace {
    private workspaceRoot!: vscode.Uri;
    private sandboxRoot!: vscode.Uri;
    private namespaceRefactorService!: NamespaceRefactorService;

    public async initialize(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, "A workspace folder is required for integration tests.");

        this.workspaceRoot = workspaceFolder.uri;
        this.sandboxRoot = vscode.Uri.joinPath(this.workspaceRoot, ".tmp-tests", "namespace-refactor-integration");
        this.namespaceRefactorService = ContainerFactory.getDefaultContainer().get(NamespaceRefactorService);

        await this.deleteIfExists(this.sandboxRoot);
        await vscode.workspace.fs.createDirectory(this.sandboxRoot);
    }

    public async dispose(): Promise<void> {
        await this.deleteIfExists(this.sandboxRoot);
    }

    public async reset(): Promise<void> {
        await this.deleteChildren(this.sandboxRoot);
    }

    public getService(): NamespaceRefactorService {
        return this.namespaceRefactorService;
    }

    public uri(relativePath: string): vscode.Uri {
        const segments = relativePath.split(/[\\/]/u);
        return vscode.Uri.joinPath(this.sandboxRoot, ...segments);
    }

    public async writeWorkspaceFiles(files: Record<string, string>): Promise<void> {
        for (const [relativePath, content] of Object.entries(files)) {
            const fileUri = this.uri(relativePath);
            const directoryPath = path.posix.dirname(relativePath.replace(/\\/gu, "/"));
            if (directoryPath !== ".") {
                await vscode.workspace.fs.createDirectory(this.uri(directoryPath));
            }

            await vscode.workspace.fs.writeFile(fileUri, textEncoder.encode(normalizeLineEndings(content)));
        }
    }

    public async readFile(fileUri: vscode.Uri): Promise<string> {
        const content = await vscode.workspace.fs.readFile(fileUri);
        return textDecoder.decode(content);
    }

    private async deleteChildren(directoryUri: vscode.Uri): Promise<void> {
        const entries = await vscode.workspace.fs.readDirectory(directoryUri);
        for (const [name] of entries) {
            await vscode.workspace.fs.delete(vscode.Uri.joinPath(directoryUri, name), {
                recursive: true,
                useTrash: false,
            });
        }
    }

    private async deleteIfExists(targetUri: vscode.Uri): Promise<void> {
        try {
            await vscode.workspace.fs.delete(targetUri, { recursive: true, useTrash: false });
        } catch (error) {
            if (!(error instanceof vscode.FileSystemError)) {
                throw error;
            }
        }
    }
}

export function php(strings: TemplateStringsArray, ...values: string[]): string {
    const raw = String.raw({ raw: strings.raw }, ...values);
    const trimmed = raw.replace(/^\n/u, "").replace(/\n\s*$/u, "\n");
    const lines = trimmed.split("\n");
    const indents = lines
        .filter((line) => line.trim().length > 0)
        .map((line) => line.match(/^ */u)?.[0].length ?? 0);
    const minIndent = indents.length > 0 ? Math.min(...indents) : 0;

    return lines.map((line) => line.slice(minIndent)).join("\n");
}

export function normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/gu, "\n");
}

export function assertNormalizedFileEquals(actual: string, expected: string): void {
    assert.strictEqual(normalizeLineEndings(actual), normalizeLineEndings(expected));
}
