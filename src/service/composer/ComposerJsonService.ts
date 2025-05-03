import * as vscode from "vscode";
import { ComposerJsonFinder } from "./ComposerJsonFinder";
import { ComposerJsonParser } from "./ComposerJsonParser";
import { AutoloadConfigType } from "./type/AutoloadConfigType";
import { AutoloadConfigsType } from "./type/AutoloadConfigsType";
import { ComposerJsonType } from "./type/ComposerJsonType";

/**
 * Service for resolving and parsing composer.json files in PHP projects.
 */
export class ComposerJsonService {
    /**
     * Creates a new ComposerJsonService instance.
     * @param composerJsonFinder - The finder for composer.json files
     * @param composerJsonParser - The parser for composer.json files
     */
    constructor(
        private readonly composerJsonFinder: ComposerJsonFinder,
        private readonly composerJsonParser: ComposerJsonParser
    ) {}

    /**
     * Finds a composer.json file starting from the target URI.
     * @param targetUri - The URI to start searching from
     * @returns Promise resolving to the found composer.json URI or undefined if not found
     */
    public async find(targetUri: vscode.Uri): Promise<vscode.Uri | undefined> {
        return this.composerJsonFinder.find(targetUri);
    }

    /**
     * Parses a composer.json file into a JavaScript object.
     * @param composerJsonUri - URI of the composer.json file to parse
     * @returns Promise resolving to the parsed composer.json content
     * @throws Error if the file cannot be read or parsed
     */
    public async parse(composerJsonUri: vscode.Uri): Promise<ComposerJsonType> {
        return this.composerJsonParser.parse(composerJsonUri);
    }

    /**
     * Extracts autoload configurations from a composer.json file.
     * @param uri - URI of the composer.json file
     * @returns Promise resolving to autoload configurations or undefined if parsing fails
     */
    public async resolveAutoloadConfigs(uri: vscode.Uri): Promise<AutoloadConfigsType | undefined> {
        try {
            const composerJson = await this.parse(uri);
            return this.extractAutoloadConfigs(composerJson);
        } catch (error) {
            return;
        }
    }

    /**
     * Extracts PSR-0 and PSR-4 autoload configurations from parsed composer.json.
     * @param composerJson - Parsed composer.json content
     * @returns Object containing PSR-0 and PSR-4 autoload configurations
     */
    private extractAutoloadConfigs(composerJson: ComposerJsonType): AutoloadConfigsType {
        return {
            psr4: this.extractAutoloadConfig(composerJson, "psr-4"),
            psr0: this.extractAutoloadConfig(composerJson, "psr-0"),
        };
    }

    /**
     * Extracts a specific autoload configuration (PSR-0 or PSR-4) from composer.json.
     * @param composerJson - Parsed composer.json content
     * @param psr - The PSR standard to extract ("psr-4" or "psr-0")
     * @returns Mapping of namespace prefixes to directories
     */
    private extractAutoloadConfig(composerJson: ComposerJsonType, psr: "psr-4" | "psr-0"): AutoloadConfigType {
        const result: AutoloadConfigType = {};
        const autoLoadTypes = ["autoload-dev", "autoload"] as const;
        for (const autoLoadType of autoLoadTypes) {
            if (!composerJson?.[autoLoadType]?.[psr]) {
                continue;
            }
            for (const [namespace, dirs] of Object.entries(composerJson[autoLoadType][psr] || {})) {
                const directories = Array.isArray(dirs) ? dirs : [dirs as string];
                result[namespace] = directories;
            }
        }
        return result;
    }
}
