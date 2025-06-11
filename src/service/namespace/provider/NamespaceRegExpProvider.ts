import { escapeRegExp } from "../../../utils/regexp/escapeRegExp";
import { IdentifierKindEnum } from "./../enum/IdentifierKindEnum";

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
        function: "[fF][uU][nN][cC][tT][iI][oO][nN]",
        const: "[cC][oO][nN][sS][tT]",
        extends: "[eE][xX][tT][eE][nN][dD][sS]",
        implements: "[iI][mM][pP][lL][eE][mM][eE][nN][tT][sS]",
        new: "[nN][eE][wW]",
        return: "[rR][eE][tT][uU][rR][nN]",
        param: "[pP][aA][rR][aA][mM]",
        throws: "[tT][hH][rR][oO][wW][sS]",
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
     * Creates a regular expression for non-qualified oop references in PHP code.
     * @returns RegExp for finding non-qualified references.
     */
    public getNonQualifiedOopReferenceRegExp(): RegExp {
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
            // Match non-namespaced identifiers after extends/implements
            `(?<=\\b(?:${extendsPattern}|${implementsPattern})\\s+|(?:${extendsPattern}|${implementsPattern})[^;{{]*?,\\s*)(${identifierPattern})(?=\\s*[,;{{])`,
            // New instantiations
            `${newPattern}\\s+(${identifierPattern})\\b\\s*\\(`,
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
     * Creates a regular expression for non-qualified function references in PHP code.
     * @returns RegExp for finding non-qualified function references.
     */
    public getNonQualifiedFunctionReferenceRegExp(): RegExp {
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;
        return new RegExp(`(?<!([\\p{L}\\d_\\\\:>$]|#\\[)\\s*)(${identifierPattern})\\s*(?=\\()`, "gu");
    }

    /**
     * Creates a regular expression for non-qualified constant references in PHP code.
     * Matches constant usages that are not qualified by namespace, class, or object context.
     * Excludes constants accessed via static, instance, or array/object dereferencing, and avoids matches inside strings or after PHP keywords.
     * @todo You may need to filter out matches that allready matched by other regexes, to avoid false positives!
     * @returns RegExp for finding non-qualified constant references.
     */
    public getNonQualifiedConstantReferenceRegExp(): RegExp {
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;
        const orPatterns = [
            // Match non-qualified constants in various contexts
            `(?<![\\p{L}\\d_\\\\$'"]+\\s*|::|->)\\b(${identifierPattern})\\b(?!\\s*:\\s*[^_$'"{])(?!\\s*[\\p{L}\\d_\\\\>(('"$}\\[]|->)`,
            // Match constants after case statements
            `(?<=case\\s*)(?:[+-]?)\\b(${identifierPattern})\\b(?=\\s*:)`
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
            return: returnPattern,
            param: paramPattern,
            throws: throwsPattern,
        } = NamespaceRegExpProvider.keywordPatterns;

        // Pattern for a partially qualified namespace (at least one backslash, not at the beginning)
        const partiallyQualifiedPattern = `(${identifierPattern}(?:\\\\${identifierPattern})+)`;
        // Pattern for allowed for prefixes and postfixes (e.g., after certain keywords or symbols)
        const escapedSpecialChars = escapeRegExp(";,{}()=.:[]+-/%<>?!$&|^~@#");
        const specialCharPattern = `\\s*[${escapedSpecialChars}]\\s*`;

        // The different contexts where partially qualified namespaces can appear
        const contexts = [
            // After extends/implements
            `(?:${extendsPattern}|${implementsPattern})\\s+${partiallyQualifiedPattern}\\b`,
            // In new instantiations
            `${newPattern}\\s+${partiallyQualifiedPattern}\\b`,
            // Used with return statements
            `${returnPattern}\\s+${partiallyQualifiedPattern}\\b`,
            // Used in doc comments for parameters, return types, and exceptions
            `(?<=(?:@${paramPattern}|@${returnPattern}|@${throwsPattern})\s*)${partiallyQualifiedPattern}\\b`,
            // In trait use statements inside classes
            `(?<=\\{[^}]*?${usePattern}\\s+|\\{[^}]*?${usePattern}[^;]*?,\\s*)${partiallyQualifiedPattern}(?=\\s*[,;])`,
            // General use like return type declarations, functions calls, parameter, const, etc.
            `(?<=${specialCharPattern})${partiallyQualifiedPattern}(?=${specialCharPattern})`,
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
     * Supports matching fully qualified, partial, or aliased imports, and can distinguish between class, function, and constant imports.
     * @param value Fully qualified namespace, partial namespace, or alias to match.
     * @param options Optional settings:
     *   - matchType: 'fullQualified' | 'partial' | 'alias' (default: 'fullQualified')
     *   - matchKind: IdentifierKindEnum to specify class, function, or constant
     *   - includeAlias: Whether to include an optional alias in the match
     * @returns RegExp for finding the matching use statement.
     */
    public getUseStatementRegExp(
        value: string,
        options?: {
            matchType?: "fullQualified" | "partial" | "alias";
            matchKind?: IdentifierKindEnum;
            includeAlias?: boolean;
        }
    ): RegExp {
        const pattern = NamespaceRegExpProvider.keywordPatterns;
        const escapedValue = this.escape(value);
        const identifierPattern = NamespaceRegExpProvider.identifierPattern;

        let kindPattern = "";
        if (options?.matchKind === IdentifierKindEnum.Constant) {
            kindPattern = pattern.const + "\\s+";
        } else if (options?.matchKind === IdentifierKindEnum.Function) {
            kindPattern = pattern.function + "\\s+";
        }

        let namespacePattern = escapedValue;
        if (options?.matchType === "partial") {
            namespacePattern = `[\\p{L}\\d_\\\\]+\\\\${escapedValue}`;
        } else if (options?.matchType === "alias") {
            namespacePattern = `[\\p{L}\\d_\\\\]+`;
        }

        let aliasPattern = "";
        if (options?.matchType === "alias") {
            aliasPattern = `\\s+${pattern.as}\\s+${escapedValue}`;
        } else if (options?.includeAlias) {
            aliasPattern = `(?:\\s+${pattern.as}\\s+(${identifierPattern}))?`;
        }

        const regexString = `${pattern.use}\\s+${kindPattern}(${namespacePattern})${aliasPattern}\\s*;`;
        return new RegExp(regexString, "gu");
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
