import * as vscode from "vscode";
import * as path from "path";
import { ComposerJsonFinder } from "./model/ComposerJsonFinder";
import { ComposerJsonParser } from "./model/ComposerJsonParser";

/**
 * Service for resolving and parsing composer.json files in PHP projects
 */
export class ComposerJsonService {
    constructor(
        private readonly finder: ComposerJsonFinder,
        private readonly parser: ComposerJsonParser
    ) {}


    public async findAndParse(targetUri: vscode.Uri): Promise<any> {
        const composerJsonUri = await this.finder.find(targetUri);
        if (!composerJsonUri) {
            throw new Error("Could not find composer.json file");
        }
        return this.parser.parse(composerJsonUri);
    }

    /**
     * Finds the composer.json file starting from the target folder and moving up the directory hierarchy
     * @param targetFolder The starting folder to search from
     * @returns URI of the composer.json file or undefined if not found
     */
    public async findComposerJson(targetFolder: vscode.Uri): Promise<vscode.Uri | undefined> {
        let currentFolder = targetFolder;
        const workspaceRoot = this.getWorkspaceRootUri(targetFolder);

        while (true) {
            // Check for composer.json in current folder
            const composerJsonUri = vscode.Uri.joinPath(currentFolder, "composer.json");
            try {
                const stat = await vscode.workspace.fs.stat(composerJsonUri);
                if ((stat.type & vscode.FileType.File) === vscode.FileType.File) {
                    return composerJsonUri;
                }
            } catch (error) {
                // File doesn't exist in the current folder - continue searching
            }

            // Break if we've reached the workspace root
            if (this.isWorkspaceRoot(currentFolder, workspaceRoot)) {
                break;
            }

            // Try to get parent folder, break if we can't go up further
            const parentFolder = this.getParentFolder(currentFolder);
            if (!parentFolder) {
                break;
            }

            currentFolder = parentFolder;
        }
        return undefined;
    }

    /**
     * Reads and parses the composer.json file
     * @param composerJsonUri URI of the composer.json file
     * @returns Parsed composer.json content
     * @throws Error if the file cannot be read or parsed
     */
    public async parseComposerJson(composerJsonUri: vscode.Uri): Promise<any> {
        try {
            const stat = await vscode.workspace.fs.stat(composerJsonUri);
            if ((stat.type & vscode.FileType.File) !== vscode.FileType.File) {
                throw new Error(`Path is not a file: ${composerJsonUri.fsPath}`);
            }

            const content = await vscode.workspace.fs.readFile(composerJsonUri);
            return JSON.parse(Buffer.from(content).toString("utf8"));
        } catch (error: unknown) {
            this.showErrorMessage("Error reading composer.json", error);
            throw error;
        }
    }

    /**
     * Gets the parent folder of a given URI
     * @param uri The URI to get the parent folder from
     * @returns The parent folder URI or undefined if at the root
     */
    private getParentFolder(uri: vscode.Uri): vscode.Uri | undefined {
        const dirname = path.dirname(uri.fsPath);
        if (dirname === uri.fsPath) {
            return undefined;
        }
        return vscode.Uri.file(dirname);
    }

    /**
     * Gets the workspace root URI for the given URI
     * @param uri The URI to find the workspace root for
     * @returns The workspace root URI or undefined if not in a workspace
     */
    private getWorkspaceRootUri(uri: vscode.Uri): vscode.Uri | undefined {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        return workspaceFolder?.uri;
    }

    /**
     * Checks if the given folder is the workspace root
     * @param currentFolder The folder to check
     * @param workspaceFolder The workspace root URI
     * @returns True if the folder is the workspace root, false otherwise
     */
    private isWorkspaceRoot(currentFolder: vscode.Uri, workspaceFolder: vscode.Uri | undefined): boolean {
        if (!workspaceFolder) {
            return false;
        }
        return this.isSameUri(currentFolder, workspaceFolder);
    }

    /**
     * Checks if two URIs point to the same location
     * @param uri1 First URI to compare
     * @param uri2 Second URI to compare
     * @returns True if the URIs point to the same location
     */
    private isSameUri(uri1: vscode.Uri, uri2: vscode.Uri): boolean {
        return uri1.toString() === uri2.toString();
    }

    /**
     * Shows an error message to the user
     * @param message The main error message
     * @param error The error object
     */
    private showErrorMessage(message: string, error: unknown): void {
        vscode.window.showErrorMessage(
            vscode.l10n.t("{0}: {1}", message, error instanceof Error ? error.message : String(error))
        );
    }
}
