import { escapeRegExp } from "../../../utils/regexp/escapeRegExp";

/**
 * Provides regular expressions for PHP namespace and identifier operations.
 */
export class NamespaceRegExpProvider {
    // General PHP identifier pattern (Unicode letters, digits, underscore)
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
     * Creates a regular expression for fully qualified namespace references with word boundary checks.
     * @param fullyQualifiedNamespace The fully qualified namespace.
     * @returns RegExp for finding the fully qualified namespace.
     */
    public getFullyQualifiedNamespaceRegExp(fullyQualifiedNamespace: string): RegExp {
        const namespace = this.escape(fullyQualifiedNamespace);
        return new RegExp(`(?<![\\p{L}\\d_])${namespace}(?![\\p{L}\\d_\\\\])`, "gu");
    }

    /**
     * Creates a regular expression that finds any namespace declaration and captures the namespace name.
     * @returns RegExp for finding namespace declarations.
     */
    public getNamespaceDeclarationRegExp(): RegExp {
        return new RegExp(/[^\r\n\s]*namespace\s+([\p{L}\d_\\]+)\s*;/mu);
    }

    /**
     * Creates a regular expression that finds PHP definitions (class/interface/enum/trait) and captures the type and name.
     * @returns RegExp for finding PHP definitions.
     */
    public getDefinitionRegExp(): RegExp {
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;
        return new RegExp(`\\b(class|interface|enum|trait)\\s+(${identifierPattern})`, "gu");
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
     * Creates a regular expression for non-qualified references in PHP code for updating to FQNs.
     * @returns RegExp for finding non-qualified references.
     */
    public getNonQualifiedReferenceRegExp(): RegExp {
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;
        const patterns = [
            // Attribute annotations (PHP 8+)
            `#\\[\\s*(${identifierPattern})`,
            // Extends/implements clauses
            `(?:extends|implements)\\s+(${identifierPattern})(?!\\s*\\\\)`,
            // New instantiations
            `new\\s+(${identifierPattern})(?!\\s*\\\\)`,
            // use statements (single-level namespaces only)
            `use\\s+(${identifierPattern})\\s*;`,
            // Static access
            `\\b(${identifierPattern})(?!\\s*\\\\)::`,
        ];
        return new RegExp(patterns.join("|"), "gu");
    }

    /**
     * Creates a regular expression for standalone identifiers with word boundary checks.
     * @param identifier The identifier to match.
     * @returns RegExp for finding the specific identifier.
     */
    public getIdentifierRegExp(identifier: string): RegExp {
        const id = this.escape(identifier);
        return new RegExp(`(?<![\\p{L}\\d_\\\\])${id}(?![\\p{L}\\d_\\\\])`, "gu");
    }

    /**
     * Creates a regular expression for finding a PHP `use` statement.
     * @param value Fully qualified namespace, partial namespace, or alias.
     * @param options Options for the search:
     *                matchType: 'fullQualified' | 'partial' | 'alias';
     *                includeAlias: Whether to include an optional alias.
     * @returns RegExp for finding the use statement.
     */
    public getUseStatementRegExp(
        value: string,
        options?: { matchType?: "fullQualified" | "partial" | "alias"; includeAlias?: boolean }
    ): RegExp {
        const escapedValue = this.escape(value);
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;

        let namespacePattern: string;
        let aliasPattern = options?.includeAlias ? `(?:\\s+as\\s+(${identifierPattern}))?` : "";

        switch (options?.matchType) {
            case "partial":
                namespacePattern = `[\\p{L}\\d_\\\\]+\\\\${escapedValue}`;
                break;
            case "alias":
                namespacePattern = `[\\p{L}\\d_\\\\]+`;
                aliasPattern = `\\s+as\\s+${escapedValue}`;
                break;
            case "fullQualified":
            default:
                namespacePattern = escapedValue;
                break;
        }

        return new RegExp(`use\\s+(${namespacePattern})${aliasPattern}\\s*;`, "gu");
    }

    /**
     * Creates a regular expression that finds all `use` statements in a file.
     * Useful for finding the last use statement for insertions.
     * @returns RegExp for finding all use statements.
     */
    public getLastUseStatementRegExp(): RegExp {
        return new RegExp(/^use\s+[\p{L}\d_\\]+\s*;/gmu);
    }
}
