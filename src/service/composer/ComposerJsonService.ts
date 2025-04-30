import * as vscode from "vscode";
import { ComposerJsonFinder } from "./ComposerJsonFinder";
import { ComposerJsonParser } from "./ComposerJsonParser";
import { AutoloadConfigType } from "./type/AutoloadConfigType";
import { AutoloadConfigsType } from "./type/AutoloadConfigsType";

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

    /**
     * Extracts autoload configurations from composer.json file
     * @param uri URI of the composer.json file
     * @returns Autoload configurations for PSR-0 and PSR-4 or undefined if parsing fails
     */
    public async resolveAutoloadConfigs(uri: vscode.Uri): Promise<AutoloadConfigsType | undefined> {
        try {
            const composerJson = this.parse(uri);
            return this.extractAutoloadConfigs(composerJson);
        } catch (error) {
            return;
        }
    }

    /**
     * Extracts PSR-0 and PSR-4 autoload configurations from parsed composer.json
     * @param composerJson Parsed composer.json content
     * @returns Object containing PSR-0 and PSR-4 autoload configurations
     */
    private extractAutoloadConfigs(composerJson: any): AutoloadConfigsType {
        return {
            psr4: this.extractAutoloadConfig(composerJson, "psr-4"),
            psr0: this.extractAutoloadConfig(composerJson, "psr-0"),
        };
    }

    /**
     * Extracts a specific autoload configuration (PSR-0 or PSR-4) from composer.json
     * @param composerJson Parsed composer.json content
     * @param psr The PSR standard to extract ("psr-4" or "psr-0")
     * @returns Mapping of namespace prefixes to directories
     */
    private extractAutoloadConfig(composerJson: any, psr: "psr-4" | "psr-0"): AutoloadConfigType {
        const result: AutoloadConfigType = {};
        if (composerJson?.autoload?.[psr]) {
            for (const [namespace, dirs] of Object.entries(composerJson.autoload[psr])) {
                // Convert single directory string to array for consistent handling
                const directories = Array.isArray(dirs) ? dirs : [dirs as string];
                result[namespace] = directories;
            }
        }
        return result;
    }
}
