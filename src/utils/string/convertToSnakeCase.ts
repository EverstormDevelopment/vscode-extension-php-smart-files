/**
 * Converts a PascalCase or camelCase string to snake_case
 * @param input - The PascalCase or camelCase string to convert
 * @returns The converted string in snake_case format
 */
export function convertToSnakeCase(input: string): string {
    if (!input) {
        return "";
    }

    const result = input.replace(/(\p{Ll})(\p{Lu})/gu, "$1_$2").replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1_$2");
    return result.toLowerCase();
}
