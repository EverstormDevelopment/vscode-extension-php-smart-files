import * as path from "path";
import * as vscode from "vscode";
import { getPathNormalized } from "../../../utils/filesystem/getPathNormalized";
import { ComposerJsonService } from "../../composer/model/ComposerJsonService";
import { AutoloadConfigsType } from "../../composer/type/AutoloadConfigsType";
import { NamespaceMatchType } from "../type/NamespaceMatchType";
import { NamespacePathValidator } from "../validator/NamespacePathValidator";

/**
 * Resolves PHP namespaces based on file paths and Composer autoload configurations.
 * Uses PSR-0 and PSR-4 autoloading standards to determine the appropriate namespace
 * for a given file path.
 */
export class NamespaceResolver {
    /**
     * Creates a new instance of the NamespaceResolver.
     * @param composerJsonService Service for retrieving and parsing composer.json files
     * @param namespacePathValidator Validator for ensuring namespace paths are valid
     */
    constructor(
        private readonly composerJsonService: ComposerJsonService,
        private readonly namespacePathValidator: NamespacePathValidator
    ) {}

    /**
     * Safely resolves the PHP namespace for a given file URI.
     * Validates the namespace after resolution.
     * @param uri The URI of the file to resolve the namespace for
     * @returns The resolved and validated PHP namespace or undefined if not resolvable
     * @throws Error if the resolved namespace is invalid
     */
    public async resolve(uri: vscode.Uri): Promise<string | undefined> {
        const namespace = await this.resolveUnsafe(uri);
        if (!namespace) {
            return undefined;
        }

        if (!(await this.namespacePathValidator.validate(namespace))) {
            throw new Error(`Invalid namespace path: ${namespace}`);
        }

        return namespace;
    }

    /**
     * Resolves the PHP namespace for a given file URI without validation.
     * This method attempts to resolve namespaces via composer.json first,
     * then falls back to alternative methods if needed.
     * @param uri The URI of the file to resolve the namespace for
     * @returns The resolved PHP namespace or undefined if not resolvable
     */
    public async resolveUnsafe(uri: vscode.Uri): Promise<string | undefined> {
        const composerNamespace = await this.resolveByComposerJson(uri);
        if (composerNamespace) {
            return composerNamespace;
        }

        return await this.resolveByFallback(uri);
    }

    /**
     * Attempts to resolve a namespace by looking up composer.json autoload configurations.
     * This is the primary namespace resolution strategy and follows Composer's autoloading rules.
     * @param uri The URI of the file to resolve the namespace for
     * @returns The resolved namespace from composer.json or undefined if not found
     */
    private async resolveByComposerJson(uri: vscode.Uri): Promise<string | undefined> {
        const composerJsonUri = await this.composerJsonService.find(uri);
        if (!composerJsonUri) {
            return undefined;
        }

        const autoloadConfigs = await this.composerJsonService.resolveAutoloadConfigs(composerJsonUri);
        if (!autoloadConfigs) {
            return undefined;
        }

        const composerDirectory = path.dirname(composerJsonUri.fsPath);
        const relativeFilePath = path.relative(composerDirectory, uri.fsPath);
        return this.findNamespace(relativeFilePath, autoloadConfigs);
    }

    /**
     * Fallback namespace resolution strategy when composer.json cannot be found or
     * doesn't contain applicable autoload configurations. Uses the workspace folder
     * structure and configuration settings to determine a namespace.
     * @param uri The URI of the file to resolve the namespace for
     * @returns The resolved fallback namespace or undefined if fallback is disabled
     */
    private async resolveByFallback(uri: vscode.Uri): Promise<string | undefined> {
        const fallbackNamespace = this.getNamespaceFallback();
        if (!fallbackNamespace) {
            return undefined;
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            return fallbackNamespace;
        }

        const workspacePath = workspaceFolder.uri.fsPath;
        const relativeFilePath = path.relative(workspacePath, uri.fsPath);
        const namespace = this.buildNamespace(relativeFilePath, { namespace: fallbackNamespace + "\\", directory: "" });

        return namespace || fallbackNamespace;
    }

    /**
     * Searches for a PHP namespace that matches the given relative file path in the autoload configurations.
     * @param relativePath The relative file path to find a namespace for
     * @param autoloadConfigs The Composer autoload configurations to search in
     * @returns The matching namespace or undefined if none found
     */
    private findNamespace(relativePath: string, autoloadConfigs: AutoloadConfigsType): string | undefined {
        for (const [type, config] of Object.entries(autoloadConfigs)) {
            const namespace = this.findNamespaceForPath(relativePath, config, type === "psr0");
            if (namespace) {
                return namespace;
            }
        }
        return undefined;
    }

    /**
     * Returns the fallback namespace from configuration if enabled.
     * @returns The configured fallback namespace or undefined if the fallback option is disabled
     */
    private getNamespaceFallback(): string | undefined {
        const config = vscode.workspace.getConfiguration("phpSmartFiles");
        const useFallbackNamespace = config.get<boolean>("useFallbackNamespace", false);
        if (!useFallbackNamespace) {
            return undefined;
        }

        return config.get<string>("fallbackNamespace", "App");
    }

    /**
     * Finds the namespace for a relative path using the provided namespace map and autoload type.
     * @param relativePath The file path relative to the composer.json directory
     * @param namespaceMap The mapping of namespace prefixes to directories
     * @param isPsr0 Whether to use PSR-0 or PSR-4 autoloading rules
     * @returns The resolved namespace or undefined if not found
     */
    private findNamespaceForPath(
        relativePath: string,
        namespaceMap: Record<string, string[]>,
        isPsr0: boolean
    ): string | undefined {
        relativePath = getPathNormalized(relativePath);
        const namespaceMatch = this.findBestMatch(relativePath, namespaceMap);
        if (!namespaceMatch) {
            return undefined;
        }

        return this.buildNamespace(relativePath, namespaceMatch, isPsr0);
    }

    /**
     * Finds the best matching namespace prefix for a relative path.
     * @param relativePath The file path relative to the composer.json directory
     * @param namespaceMap The mapping of namespace prefixes to directories
     * @returns The best matching namespace information or undefined if not found
     */
    private findBestMatch(
        relativePath: string,
        namespaceMap: Record<string, string[]>
    ): NamespaceMatchType | undefined {
        let namespaceMatch: NamespaceMatchType | undefined;

        for (const [namespacePrefix, directories] of Object.entries(namespaceMap)) {
            const directoriesBestMatch = this.findDirectoriesBestMatch(relativePath, directories, namespacePrefix);
            if (!directoriesBestMatch) {
                continue;
            }
            namespaceMatch = this.getBestMatch(namespaceMatch, directoriesBestMatch);
        }
        return namespaceMatch;
    }

    /**
     * Finds the best matching directory for a path from a list of directories.
     * @param path The path to find a matching directory for
     * @param directories List of directories to check against
     * @param namespace The namespace associated with the directories
     * @returns The best matching directory information or undefined if not found
     */
    private findDirectoriesBestMatch(
        path: string,
        directories: string[],
        namespace: string
    ): NamespaceMatchType | undefined {
        let directoryBestMatch: NamespaceMatchType | undefined;

        for (const directory of directories) {
            const directoryMatch = this.getDirectoryMatch(path, directory, namespace);
            if (!directoryMatch) {
                continue;
            }

            directoryBestMatch = this.getBestMatch(directoryBestMatch, directoryMatch);
        }

        return directoryBestMatch;
    }

    /**
     * Checks if a path matches a directory and creates a match object if it does.
     * @param path The path to check
     * @param directory The directory to match against
     * @param namespace The namespace associated with the directory
     * @returns A namespace match object or undefined if no match
     */
    private getDirectoryMatch(path: string, directory: string, namespace: string): NamespaceMatchType | undefined {
        const normalizedDirectory = getPathNormalized(directory);
        if (!normalizedDirectory || path.startsWith(normalizedDirectory + "/") || path === normalizedDirectory) {
            return { namespace: namespace, directory: normalizedDirectory };
        }
        return undefined;
    }

    /**
     * Returns the best namespace match based on directory length.
     * Prefers matches with longer directory paths as they are more specific.
     * @param currentMatch The current best match
     * @param newMatch A new potential match to compare against
     * @returns The better match of the two or undefined if both are undefined
     */
    private getBestMatch(
        currentMatch: NamespaceMatchType | undefined,
        newMatch: NamespaceMatchType | undefined
    ): NamespaceMatchType | undefined {
        if (!currentMatch && !newMatch) {
            return undefined;
        }

        const currentMatchLength = currentMatch?.directory.length ?? 0;
        const newMatchLength = newMatch?.directory?.length ?? 0;
        if (currentMatchLength >= newMatchLength) {
            return currentMatch;
        }
        return newMatch;
    }

    /**
     * Builds a complete namespace string from a file path and namespace match.
     * @param filePath The file path to build a namespace for
     * @param namespaceMatch The matched namespace information
     * @param isPsr0 Whether to use PSR-0 or PSR-4 autoloading rules
     * @returns The complete namespace string
     */
    private buildNamespace(filePath: string, namespaceMatch: NamespaceMatchType, isPsr0?: boolean): string {
        const relativeFilePath = path.relative(namespaceMatch.directory, filePath);
        const parsedFilePath = path.parse(relativeFilePath);

        if (filePath === namespaceMatch.directory || !parsedFilePath.dir) {
            return this.getNamespaceNormalized(namespaceMatch.namespace);
        }

        const namespaceSegments = this.getNamespaceSegmentsFromPath(
            parsedFilePath.dir,
            namespaceMatch.namespace,
            isPsr0
        );
        return this.buildNamespaceWithSegments(namespaceMatch.namespace, namespaceSegments);
    }

    /**
     * Extracts namespace segments from a relative path and applies PSR-specific rules if needed.
     * @param relativePath The relative path to extract namespace segments from
     * @param namespacePrefix The namespace prefix
     * @param isPsr0 Whether to apply PSR-0 specific rules
     * @returns An array of namespace segments
     */
    private getNamespaceSegmentsFromPath(relativePath: string, namespacePrefix: string, isPsr0?: boolean): string[] {
        if (!relativePath) {
            return [];
        }

        const namespaceSegments = relativePath.split(/[/\\]/);
        if (isPsr0) {
            this.removeDuplicateNamespaceSegmentsForPsr0(namespacePrefix, namespaceSegments);
        }
        return namespaceSegments;
    }

    /**
     * Combines a namespace prefix with namespace segments to form a complete namespace.
     * @param namespacePrefix The namespace prefix
     * @param namespaceSegments The namespace segments to append
     * @returns The complete normalized namespace
     */
    private buildNamespaceWithSegments(namespacePrefix: string, namespaceSegments: string[]): string {
        namespacePrefix = this.getNamespaceNormalized(namespacePrefix);
        if (namespaceSegments.length === 0) {
            return namespacePrefix;
        }

        const namespace = `${namespacePrefix}\\${namespaceSegments.join("\\")}`;
        return this.getNamespaceNormalized(namespace);
    }

    /**
     * Removes the first segment from namespace segments if it matches the last part of the namespace prefix.
     * This is specific to PSR-0 autoloading, where the last part of the namespace prefix is already included
     * in the namespace and should not be duplicated in the path segments.
     * @param namespacePrefix The namespace prefix
     * @param namespaceSegments The segments of the namespace path
     */
    private removeDuplicateNamespaceSegmentsForPsr0(namespacePrefix: string, namespaceSegments: string[]): void {
        const namespaceParts = namespacePrefix.split("\\").filter((p) => p !== "");
        const prefixLastPart = namespaceParts.length > 0 ? namespaceParts[namespaceParts.length - 1] : "";
        if (namespaceSegments.length > 0 && namespaceSegments[0] === prefixLastPart) {
            namespaceSegments.shift();
        }
    }

    /**
     * Normalizes a namespace string by removing leading and trailing backslashes.
     * @param namespace The namespace to normalize
     * @returns The normalized namespace string
     */
    private getNamespaceNormalized(namespace: string): string {
        return namespace.replace(/^\\|\\$/g, "");
    }
}
