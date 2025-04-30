import * as vscode from "vscode";
import { ComposerJsonFinder } from "./ComposerJsonFinder";
import { ComposerJsonParser } from "./ComposerJsonParser";

/**
 * Service for resolving and parsing composer.json files in PHP projects
 */
export class ComposerJsonService {
    /**
     * Creates a new ComposerJsonService
     * @param composerJsonFinder The finder for composer.json files
     * @param composerJsonParser The parser for composer.json files
     */
    constructor(
        private readonly composerJsonFinder: ComposerJsonFinder,
        private readonly composerJsonParser: ComposerJsonParser
    ) {}

    /**
     * Finds a composer.json file starting from the target URI
     * @param targetUri The URI to start searching from
     * @returns URI of the found composer.json file or undefined if not found
     */
    public async find(targetUri: vscode.Uri): Promise<vscode.Uri | undefined> {
        return this.composerJsonFinder.find(targetUri);
    }

    /**
     * Parses a composer.json file
     * @param composerJsonUri URI of the composer.json file to parse
     * @returns Parsed composer.json content
     * @throws Error if the file cannot be read or parsed
     */
    public async parse(composerJsonUri: vscode.Uri): Promise<any> {
        return this.composerJsonParser.parse(composerJsonUri);
    }
}
