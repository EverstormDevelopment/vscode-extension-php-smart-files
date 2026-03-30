import { escapeRegExp } from "../../../utils/regexp/escapeRegExp";

/**
 * Provides regular expressions for PHP namespace and identifier validation,
 * and a word-boundary replacement helper for identifier names.
 */
export class NamespaceRegExpProvider {
    /**
     * General PHP identifier pattern (Unicode letters, digits, underscore)
     */
    private static readonly identifierPattern = "[\\p{L}_][\\p{L}\\d_]*";

    /**
     * Escapes a string for use in a regular expression.
     * @param value The string to escape.
     * @returns The escaped string.
     */
    private escape(value: string): string {
        return escapeRegExp(value);
    }

    /**
     * Creates a regular expression that checks for a valid PHP namespace pattern.
     * @returns RegExp for validating a PHP namespace format.
     */
    public getNamespacePatternRegExp(): RegExp {
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;
        return new RegExp(`^${identifierPattern}(?:\\\\${identifierPattern})*$`, "u");
    }

    /**
     * Creates a regular expression to validate PHP identifiers according to naming rules.
     * @returns RegExp for checking a PHP identifier.
     */
    public getIdentifierPatternRegExp(): RegExp {
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;
        return new RegExp(`^${identifierPattern}$`, "u");
    }

    /**
     * Creates a regular expression for finding a specific identifier in PHP code using word boundaries.
     * @param identifier The identifier to match (e.g. class name, function name).
     * @param includeNamespace Whether to allow a preceding namespace separator (default: false).
     * @returns RegExp for finding the identifier with word-boundary checks.
     */
    public getIdentifierRegExp(identifier: string, includeNamespace?: boolean): RegExp {
        const id = this.escape(identifier);
        const excludeNamespace = includeNamespace ? "" : this.escape("\\");
        return new RegExp(`(?<![\\p{L}\\d_${excludeNamespace}])${id}(?![\\p{L}\\d_\\\\])`, "gu");
    }
}
