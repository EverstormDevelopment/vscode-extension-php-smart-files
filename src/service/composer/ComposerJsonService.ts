import * as path from "path";
import * as vscode from "vscode";
import { ComposerJsonFinder } from "./ComposerJsonFinder";
import { ComposerJsonParser } from "./ComposerJsonParser";

/**
 * Service for resolving and parsing composer.json files in PHP projects
 */
export class ComposerJsonService {
    constructor(
        private readonly composerJsonFinder: ComposerJsonFinder,
        private readonly composerJsonParser: ComposerJsonParser
    ) {}

    /**
     * Finds and parses a composer.json file starting from the target URI
     * @param targetUri The URI to start searching from (file or directory)
     * @returns Parsed composer.json content as an object
     * @throws Error if composer.json cannot be found or parsed
     */
    public async findAndParse(targetUri: vscode.Uri): Promise<any> {
        const composerJsonUri = await this.composerJsonFinder.find(targetUri);
        if (!composerJsonUri) {
            throw new Error("Could not find composer.json file");
        }
        return this.composerJsonParser.parse(composerJsonUri);
    }
}
