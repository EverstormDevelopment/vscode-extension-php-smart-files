import { escapeRegExp } from "../../../utils/regexp/escapeRegExp";

/**
 * Provides regular expressions for PHP namespace and identifier operations.
 */
export class NamespaceRegExpProvider {
    /**
     * General PHP identifier pattern (Unicode letters, digits, underscore)
     */
    private static readonly identifierPattern = "[\\p{L}_][\\p{L}\\d_]*";

    /**
     * PHP keywords as case-insensitive patterns.
     */
    private static readonly keywordPatterns = {
        namespace: "[nN][aA][mM][eE][sS][pP][aA][cC][eE]",
        use: "[uU][sS][eE]",
        as: "[aA][sS]",
        class: "[cC][lL][aA][sS][sS]",
        interface: "[iI][nN][tT][eE][rR][fF][aA][cC][eE]",
        enum: "[eE][nN][uU][mM]",
        trait: "[tT][rR][aA][iI][tT]",
        extends: "[eE][xX][tT][eE][nN][dD][sS]",
        implements: "[iI][mM][pP][lL][eE][mM][eE][nN][tT][sS]",
        new: "[nN][eE][wW]",
    };

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
        const namespacePattern = NamespaceRegExpProvider.keywordPatterns.namespace;
        return new RegExp(`[^\\r\\n\\s]*${namespacePattern}\\s+([\\p{L}\\d_\\\\]+)\\s*;`, "mu");
    }

    /**
     * Creates a regular expression that finds PHP definitions (class/interface/enum/trait) and captures the type and name.
     * @returns RegExp for finding PHP definitions.
     */
    public getDefinitionRegExp(): RegExp {
        const {
            class: classPattern,
            interface: interfacePattern,
            enum: enumPattern,
            trait: traitPattern,
        } = NamespaceRegExpProvider.keywordPatterns;
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;

        return new RegExp(
            `\\b(${classPattern}|${interfacePattern}|${enumPattern}|${traitPattern})\\s+(${identifierPattern})`,
            "gu"
        );
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
        const {
            extends: extendsPattern,
            implements: implementsPattern,
            new: newPattern,
            use: usePattern,
        } = NamespaceRegExpProvider.keywordPatterns;
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;

        const orPatterns = [
            // Attribute annotations (PHP 8+)
            `#\\[\\s*(${identifierPattern})`,
            // Using negative lookahead to ensure we don't match parts of qualified names
            `(?:${extendsPattern}|${implementsPattern}|,)\\s+(?!.*?(?:\\\\))\\s*(${identifierPattern})(?!\\s*\\\\)`,
            // New instantiations
            `${newPattern}\\s+(${identifierPattern})(?!\\s*\\\\)`,
            // use statements (single-level namespaces only)
            `${usePattern}\\s+(${identifierPattern})\\s*;`,
            // Trait use statement inside a class - match non-qualified trait names
            `(?<=\\{[^}]*?${usePattern}\\s+|\\{[^}]*?${usePattern}[^;]*?,\\s*)(${identifierPattern})(?!\\\\)(?=\\s*[,;])`,
            // Static access - only match non-namespaced identifiers
            `(?<![\\p{L}\\d_\\\\])(${identifierPattern})(?![\\p{L}\\d_\\\\])::`,
            // Type hints in function parameters (matches only non-qualified types)
            `[,\\(]\\s*(${identifierPattern})(?!\\s*\\\\)\\s+\\$${identifierPattern}\\b`,
            // Return type declarations (matches only non-qualified types)
            `\\)\\s*:(?:\\s*\\?)?\\s*(${identifierPattern})(?!\\s*\\\\)\\b`,
        ];

        return new RegExp(orPatterns.join("|"), "gu");
    }

    /**
     * Creates a regular expression for finding partially qualified namespace references.
     * These are references that contain at least one namespace separator but don't start with a backslash.
     * Only matches in specific contexts where partially qualified namespaces are expected.
     * @returns RegExp that matches partially qualified namespace references.
     */
    public getPartiallyQualifiedReferenceRegExp(): RegExp {
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;
        const {
            extends: extendsPattern,
            implements: implementsPattern,
            use: usePattern,
            new: newPattern,
        } = NamespaceRegExpProvider.keywordPatterns;

        // Pattern for a partially qualified namespace (at least one backslash, not at the beginning)
        const partiallyQualifiedPattern = `(${identifierPattern}(?:\\\\${identifierPattern})+)`;
        const escapedSpecialChars = escapeRegExp(";,{}()=.:[]+-/%<>?!$&|^~@#");
        const allowedPrefixPattern = `[${escapedSpecialChars}\\s*]+`;

        // The different contexts where partially qualified namespaces can appear
        const contexts = [
            // After extends/implements or after commas for multiple interfaces
            `(?:${extendsPattern}|${implementsPattern}|,)\\s+${partiallyQualifiedPattern}\\b`,
            // In static access - check that there's at least one on allowed sign and no backslash at the beginning
            `${allowedPrefixPattern}${partiallyQualifiedPattern}::`,
            // In parameter type hints
            `[,\\(]\\s*${partiallyQualifiedPattern}\\s+\\$${identifierPattern}`,
            // In return type declarations
            `\\)\\s*:\\s*(?:\\?\\s*)?${partiallyQualifiedPattern}\\b`,
            // In trait use statements inside classes
            `(?<=\\{[^}]*?${usePattern}\\s+|\\{[^}]*?${usePattern}[^;]*?,\\s*)(${identifierPattern}(?:\\\\${identifierPattern})+)(?=\\s*[,;])`,
            // In new instantiations
            `${newPattern}\\s+${partiallyQualifiedPattern}\\b`,
        ];

        return new RegExp(contexts.join("|"), "gu");
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
        const { use: usePattern, as: asPattern } = NamespaceRegExpProvider.keywordPatterns;

        let namespacePattern: string;
        let aliasPattern = options?.includeAlias ? `(?:\\s+${asPattern}\\s+(${identifierPattern}))?` : "";

        switch (options?.matchType) {
            case "partial":
                namespacePattern = `[\\p{L}\\d_\\\\]+\\\\${escapedValue}`;
                break;
            case "alias":
                namespacePattern = `[\\p{L}\\d_\\\\]+`;
                aliasPattern = `\\s+${asPattern}\\s+${escapedValue}`;
                break;
            case "fullQualified":
            default:
                namespacePattern = escapedValue;
                break;
        }

        return new RegExp(`${usePattern}\\s+(${namespacePattern})${aliasPattern}\\s*;`, "gu");
    }

    /**
     * Creates a regular expression that finds all `use` statements in a file.
     * Useful for finding the last use statement for insertions.
     * @returns RegExp for finding all use statements.
     */
    public getLastUseStatementRegExp(): RegExp {
        const { use: usePattern } = NamespaceRegExpProvider.keywordPatterns;
        return new RegExp(`^${usePattern}\\s+[\\p{L}\\d_\\\\]+\\s*;`, "gmu");
    }
}
