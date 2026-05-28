/**
 * Builds a VS Code exclude pattern from multiple glob entries.
 * @param patterns Glob patterns to exclude
 * @returns A single exclude pattern, or undefined when no patterns are provided
 */
export function getExcludePattern(patterns: string[]): string | undefined {
    const filteredPatterns = patterns.filter((pattern) => pattern.length > 0);
    if (filteredPatterns.length === 0) {
        return undefined;
    }

    if (filteredPatterns.length === 1) {
        return filteredPatterns[0];
    }

    return `{${filteredPatterns.join(",")}}`;
}
