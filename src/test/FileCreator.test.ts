import * as assert from "assert";
import * as vscode from "vscode";
import { FileCreator } from "../service/filesystem/file/model/FileCreator";

const textDecoder = new TextDecoder("utf-8");
const textEncoder = new TextEncoder();

suite("FileCreator", () => {
    let workspaceRoot: vscode.Uri;
    let sandboxRoot: vscode.Uri;
    let fileCreator: FileCreator;

    suiteSetup(async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, "A workspace folder is required for file creator tests.");

        workspaceRoot = workspaceFolder.uri;
        sandboxRoot = vscode.Uri.joinPath(workspaceRoot, ".tmp-tests", "file-creator");
        fileCreator = new FileCreator();

        await deleteIfExists(sandboxRoot);
        await vscode.workspace.fs.createDirectory(sandboxRoot);
    });

    suiteTeardown(async () => {
        await deleteIfExists(sandboxRoot);
    });

    setup(async () => {
        await deleteChildren(sandboxRoot);
    });

    test("returns false and keeps existing file content when overwrite is cancelled", async () => {
        const fileUri = vscode.Uri.joinPath(sandboxRoot, "Existing.php");
        await vscode.workspace.fs.writeFile(fileUri, textEncoder.encode("keep me"));

        await withWarningMessageResult(undefined, async () => {
            const wasCreated = await fileCreator.create(fileUri);

            assert.strictEqual(wasCreated, false);
        });

        assert.strictEqual(await readFile(fileUri), "keep me");
    });

    test("returns true and clears existing file content when overwrite is confirmed", async () => {
        const fileUri = vscode.Uri.joinPath(sandboxRoot, "Existing.php");
        await vscode.workspace.fs.writeFile(fileUri, textEncoder.encode("replace me"));

        await withWarningMessageResult("Overwrite", async () => {
            const wasCreated = await fileCreator.create(fileUri);

            assert.strictEqual(wasCreated, true);
        });

        assert.strictEqual(await readFile(fileUri), "");
    });

    async function withWarningMessageResult<T>(result: string | undefined, callback: () => Promise<T>): Promise<T> {
        const originalShowWarningMessage = vscode.window.showWarningMessage.bind(vscode.window);
        (
            vscode.window as typeof vscode.window & {
                showWarningMessage: typeof vscode.window.showWarningMessage;
            }
        ).showWarningMessage = (async () => result) as typeof vscode.window.showWarningMessage;

        try {
            return await callback();
        } finally {
            (
                vscode.window as typeof vscode.window & {
                    showWarningMessage: typeof vscode.window.showWarningMessage;
                }
            ).showWarningMessage = originalShowWarningMessage;
        }
    }

    async function readFile(uri: vscode.Uri): Promise<string> {
        const content = await vscode.workspace.fs.readFile(uri);
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
