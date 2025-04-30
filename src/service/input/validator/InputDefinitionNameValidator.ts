import * as vscode from "vscode";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";

/**
 * Validator for PHP definition names (classes, interfaces, traits, enums)
 */
export class InputDefinitionNameValidator implements InputValidatorInterface {
    /**
     * Validates a PHP definition name
     * @param input The input to validate
     * @returns Error message or empty string if valid
     */
    public async validate(input: string): Promise<string> {
        if (!input || input.trim().length === 0) {
            return vscode.l10n.t("Please enter a valid definition name");
        }

        const firstCharRegex = /^[\p{L}_]/u;
        if (!firstCharRegex.test(input)) {
            return vscode.l10n.t("Definition name must start with a letter or underscore");
        }

        const validNameRegex = /^[\p{L}_][\p{L}\p{N}_]*$/u;
        if (!validNameRegex.test(input)) {
            return vscode.l10n.t("Definition name can only contain letters, numbers, and underscores");
        }

        const reservedKeywords = [
            "abstract",
            "and",
            "array",
            "as",
            "break",
            "callable",
            "case",
            "catch",
            "class",
            "clone",
            "const",
            "continue",
            "declare",
            "default",
            "die",
            "do",
            "echo",
            "else",
            "elseif",
            "empty",
            "enddeclare",
            "endfor",
            "endforeach",
            "endif",
            "endswitch",
            "endwhile",
            "eval",
            "exit",
            "extends",
            "final",
            "finally",
            "fn",
            "for",
            "foreach",
            "function",
            "global",
            "goto",
            "if",
            "implements",
            "include",
            "include_once",
            "instanceof",
            "insteadof",
            "interface",
            "isset",
            "list",
            "match",
            "namespace",
            "new",
            "or",
            "print",
            "private",
            "protected",
            "public",
            "require",
            "require_once",
            "return",
            "static",
            "switch",
            "throw",
            "trait",
            "try",
            "unset",
            "use",
            "var",
            "while",
            "xor",
            "yield",
            "enum",
        ];

        if (reservedKeywords.includes(input.toLowerCase())) {
            return vscode.l10n.t("Cannot use PHP reserved keyword as definition name");
        }

        return "";
    }
}
