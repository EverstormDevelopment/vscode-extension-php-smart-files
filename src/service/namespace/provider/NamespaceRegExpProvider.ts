import { escapeRegExp } from "../../../utils/regexp/escapeRegExp";

/**
 * Provides regular expressions for PHP namespace and identifier operations.
 */
export class NamespaceRegExpProvider {
    // Common PHP identifier pattern (Unicode letters, digits, underscore)
    private static readonly identifierPattern = "[\\p{L}_][\\p{L}\\d_]*";

    /**
     * Escapes a string for use in a RegExp.
     * @param value The string to escape.
     */
    private escape(value: string): string {
        return escapeRegExp(value);
    }

    /**
     * Matches fully qualified namespace references with word boundary checks.
     */
    public getFullyQualifiedNamespaceRegExp(fullyQualifiedNamespace: string): RegExp {
        const namespace = this.escape(fullyQualifiedNamespace);
        return new RegExp(`(?<![\\p{L}\\d_])${namespace}(?![\\p{L}\\d_\\\\])`, "gu");
    }

    /**
     * Matches any namespace declaration and captures the namespace name.
     */
    public getNamespaceDeclarationRegExp(): RegExp {
        return new RegExp(/[^\r\n\s]*namespace\s+([\p{L}\d_\\]+)\s*;/mu);
    }

    /**
     * Matches PHP class/interface/enum/trait definitions and captures type and name.
     */
    public getDefinitionRegExp(): RegExp {
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;
        return new RegExp(`\\b(class|interface|enum|trait)\\s+(${identifierPattern})`, "gu");
    }

    /**
     * Validates PHP identifiers according to naming rules.
     */
    public getIdentifierValidationRegExp(): RegExp {
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;
        return new RegExp(`^${identifierPattern}$`, "u");
    }

    /**
     * Matches non-qualified references in PHP code for updating to FQNs.
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
     * Matches standalone identifiers with word boundary checks.
     */
    public getIdentifierRegExp(identifier: string): RegExp {
        const id = this.escape(identifier);
        return new RegExp(`(?<![\\p{L}\\d_\\\\])${id}(?![\\p{L}\\d_\\\\])`, "gu");
    }

    /**
     * Returns a RegExp matching a PHP `use` statement.
     * @param value Fully qualified namespace, partial namespace, or alias.
     * @param options matchType: 'fullQualified' | 'partial' | 'alias'; includeAlias: match optional alias.
     * @returns RegExp for matching the use statement.
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
     * Matches all `use` statements in a file (for finding the last one).
     */
    public getLastUseStatementRegExp(): RegExp {
        return new RegExp(/^use\s+[\p{L}\d_\\]+\s*;/gmu);
    }
}
