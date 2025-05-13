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
        const ns = this.escape(fullyQualifiedNamespace);
        return new RegExp(`(?<![\\p{L}\\d_])${ns}(?![\\p{L}\\d_\\\\])`, "gu");
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
        return new RegExp(`\\b(class|interface|enum|trait)\\s+(${NamespaceRegExpProvider.identifierPattern})`, "gu");
    }

    /**
     * Validates PHP identifiers according to naming rules.
     */
    public getIdentifierValidationRegExp(): RegExp {
        return new RegExp(`^${NamespaceRegExpProvider.identifierPattern}$`, "u");
    }

    /**
     * Matches non-qualified references in PHP code for updating to FQNs.
     */
    public getNonQualifiedReferenceRegExp(): RegExp {
        const id = NamespaceRegExpProvider.identifierPattern;
        const patterns = [
            // Attribute annotations (PHP 8+)
            `#\\[\\s*(${id})`,
            // Extends/implements clauses
            `(?:extends|implements)\\s+(${id})(?!\\s*\\\\)`,
            // New instantiations
            `new\\s+(${id})(?!\\s*\\\\)`,
            // use statements (single-level namespaces only)
            `use\\s+(${id})\\s*;`,
            // Static access
            `\\b(${id})(?!\\s*\\\\)::`,
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
     * Matches `use` statements for a specific fully qualified namespace.
     */
    public getUseStatementRegExp(fullyQualifiedNamespace: string): RegExp {
        const ns = this.escape(fullyQualifiedNamespace);
        return new RegExp(`use\\s+${ns}\\s*;`, "gu");
    }

    /**
     * Matches `use` statements for a specific identifier (with at least one namespace separator).
     */
    public getUseStatementByIdentiferRegExp(identifier: string): RegExp {
        const id = this.escape(identifier);
        return new RegExp(`use\\s+[\\p{L}\\d_\\\\]+\\\\${id}\\s*;`, "gu");
    }

    /**
     * Matches all `use` statements in a file (for finding the last one).
     */
    public getLastUseStatementRegExp(): RegExp {
        return new RegExp(/^use\s+[\p{L}\d_\\]+\s*;/gmu);
    }
}