/**
 * Detects the linebreak type used in a given text.
 * @param text The text to check for linebreaks
 * @returns The detected linebreak type, or "\n" if none are found
 */
export function getLinebreakType(text: string): string {
    const linebreaks = ["\r\n", "\n", "\r"];
    for (const linebreak of linebreaks) {
        if (text.includes(linebreak)) {
            return linebreak;
        }
    }
    return "\n";
}
