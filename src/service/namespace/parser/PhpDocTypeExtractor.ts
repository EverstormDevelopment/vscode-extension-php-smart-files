import { IdentifierKindEnum } from "../enum/IdentifierKindEnum";
import { IdentifierType } from "../type/IdentifierType";
import { ReservedKeywords } from "../../php/reserved/ReservedKeywords";

/**
 * Extracts importable OOP type references from PHPDoc blocks.
 * The extractor is intentionally conservative and only emits unqualified names.
 */
export class PhpDocTypeExtractor {
    /** Regular expression for matching PHPDoc block comments */
    private static readonly docBlockRegExp = /\/\*\*[\s\S]*?\*\//gu;
    /** Tag names that carry a single type expression (e.g. `@param Type $var`) */
    private static readonly simpleTypeTags = new Set(["@param", "@return", "@var", "@throws", "@property", "@property-read", "@property-write"]);
    /** Regular expression for validating a PHP identifier name */
    private static readonly identifierRegExp = /^[\p{L}_\x80-\xff][\p{L}\p{N}_\x80-\xff]*$/u;

    /**
     * Creates a new PhpDocTypeExtractor instance.
     * @param phpCode The PHP source code to extract PHPDoc types from
     */
    constructor(private readonly phpCode: string) {}

    /**
     * Returns all unqualified OOP references found inside PHPDoc type positions.
     * @returns Deduplicated list of identifier names.
     */
    public getUnqualifiedOopReferences(): IdentifierType[] {
        const identifiers = new Set<string>();

        for (const docBlock of this.getDocBlocks()) {
            for (const typeExpression of this.getTypeExpressionsFromDocBlock(docBlock)) {
                for (const identifier of this.extractIdentifiersFromTypeExpression(typeExpression)) {
                    identifiers.add(identifier);
                }
            }
        }

        return Array.from(identifiers).map((name) => ({
            name,
            kind: IdentifierKindEnum.Oop,
        }));
    }

    /**
     * Extracts all PHPDoc block comments from the PHP source code.
     * @returns Array of raw PHPDoc block strings
     */
    private getDocBlocks(): string[] {
        return this.phpCode.match(PhpDocTypeExtractor.docBlockRegExp) ?? [];
    }

    /**
     * Parses a single PHPDoc block and extracts all type expressions from supported tags.
     * @param docBlock The raw PHPDoc block string to parse
     * @returns Array of type expression strings found in the doc block
     */
    private getTypeExpressionsFromDocBlock(docBlock: string): string[] {
        const lines = docBlock
            .split(/\r?\n/gu)
            .map((line) => line.replace(/^\s*\/?\*+\s?/u, "").trim())
            .filter((line) => line.length > 0 && line !== "/");
        const tags = this.getTagEntries(lines);

        const typeExpressions: string[] = [];
        for (const entry of tags) {
            if (!entry.tag || entry.text === "") {
                continue;
            }

            if (PhpDocTypeExtractor.simpleTypeTags.has(entry.tag)) {
                const typeExpression = this.getSimpleTagTypeExpression(entry.tag, entry.text);
                if (typeExpression !== "") {
                    typeExpressions.push(typeExpression);
                }
                continue;
            }

            if (entry.tag === "@method") {
                typeExpressions.push(...this.getMethodTypeExpressions(entry.text));
            }
        }

        return typeExpressions;
    }

    /**
     * Splits PHPDoc lines into tag entries, grouping multi-line tag descriptions.
     * @param lines Cleaned PHPDoc lines (without leading `*` and whitespace)
     * @returns Array of tag/text pairs
     */
    private getTagEntries(lines: string[]): Array<{ tag: string; text: string }> {
        const entries: Array<{ tag: string; text: string }> = [];
        let currentEntry: { tag: string; text: string } | null = null;

        for (const line of lines) {
            if (line.startsWith("@")) {
                if (currentEntry) {
                    entries.push(currentEntry);
                }

                const [tag, ...rest] = line.split(/\s+/u);
                currentEntry = {
                    tag,
                    text: rest.join(" ").trim(),
                };
                continue;
            }

            if (!currentEntry) {
                continue;
            }

            currentEntry.text = `${currentEntry.text} ${line}`.trim();
        }

        if (currentEntry) {
            entries.push(currentEntry);
        }

        return entries;
    }

    /**
     * Extracts the type expression from a simple PHPDoc tag (e.g. `@param`, `@return`).
     * @param tag The PHPDoc tag name
     * @param text The text following the tag
     * @returns The extracted type expression, or an empty string if none found
     */
    private getSimpleTagTypeExpression(tag: string, text: string): string {
        switch (tag) {
            case "@param":
            case "@var":
            case "@property":
            case "@property-read":
            case "@property-write":
                return this.getLeadingTypeExpression(text, true);
            default:
                return this.getLeadingTypeExpression(text, false);
        }
    }

    /**
     * Extracts the leading type expression from a tag's text, respecting nested brackets.
     * @param text The text to extract the type expression from
     * @param stopAtVariable Whether to stop extraction when a `$variable` is encountered
     * @returns The leading type expression string
     */
    private getLeadingTypeExpression(text: string, stopAtVariable: boolean): string {
        let angleDepth = 0;
        let braceDepth = 0;
        let bracketDepth = 0;
        let parenDepth = 0;
        let current = "";

        for (let index = 0; index < text.length; index++) {
            const character = text[index];
            const isTopLevel = angleDepth === 0 && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0;

            if (isTopLevel && /\s/u.test(character)) {
                const nextSegment = text.slice(index).trimStart();
                if (nextSegment === "") {
                    break;
                }

                if (!stopAtVariable || nextSegment.startsWith("$")) {
                    break;
                }
            }

            current += character;

            switch (character) {
                case "<":
                    angleDepth++;
                    break;
                case ">":
                    angleDepth = Math.max(0, angleDepth - 1);
                    break;
                case "{":
                    braceDepth++;
                    break;
                case "}":
                    braceDepth = Math.max(0, braceDepth - 1);
                    break;
                case "[":
                    bracketDepth++;
                    break;
                case "]":
                    bracketDepth = Math.max(0, bracketDepth - 1);
                    break;
                case "(":
                    parenDepth++;
                    break;
                case ")":
                    parenDepth = Math.max(0, parenDepth - 1);
                    break;
                default:
                    break;
            }
        }

        return current.trim();
    }

    /**
     * Extracts type expressions from a `@method` tag signature (return type and parameter types).
     * @param methodSignature The raw method signature string after `@method`
     * @returns Array of type expressions found in the method signature
     */
    private getMethodTypeExpressions(methodSignature: string): string[] {
        let signature = methodSignature.trim();
        if (signature.startsWith("static ")) {
            signature = signature.slice("static ".length).trim();
        }

        const openParenIndex = this.findLastTopLevelCharacter(signature, "(");
        if (openParenIndex === -1) {
            return [];
        }

        const closeParenIndex = this.findMatchingBracket(signature, openParenIndex, "(", ")");
        if (closeParenIndex === -1) {
            return [];
        }

        const beforeArguments = signature.slice(0, openParenIndex).trim();
        const beforeParts = beforeArguments.split(/\s+/u).filter((part) => part.length > 0);
        const returnType = beforeParts.length > 1 ? beforeParts.slice(0, -1).join(" ") : "";

        const parameterList = signature.slice(openParenIndex + 1, closeParenIndex);
        const parameterTypes = this.splitTopLevel(parameterList, ",")
            .map((parameter) => this.getMethodParameterType(parameter))
            .filter((typeExpression): typeExpression is string => typeExpression.length > 0);

        return returnType ? [returnType, ...parameterTypes] : parameterTypes;
    }

    /**
     * Extracts the type annotation from a single `@method` parameter.
     * @param parameter The raw parameter string (e.g. `Type $name = default`)
     * @returns The extracted type string, or an empty string if none found
     */
    private getMethodParameterType(parameter: string): string {
        let parameterSignature = parameter.trim();
        if (parameterSignature === "") {
            return "";
        }

        const equalsIndex = this.findTopLevelCharacter(parameterSignature, "=");
        if (equalsIndex !== -1) {
            parameterSignature = parameterSignature.slice(0, equalsIndex).trim();
        }

        const parts = parameterSignature.split(/\s+/u).filter((part) => part.length > 0);
        if (parts.length === 0) {
            return "";
        }

        const variableIndex = parts.findIndex((part) => part.includes("$"));
        const typeParts = variableIndex === -1 ? parts.slice(0, -1) : parts.slice(0, variableIndex);
        if (typeParts.length === 0) {
            return "";
        }

        return typeParts
            .join(" ")
            .replace(/^[&.]+/u, "")
            .replace(/^\.{3}/u, "");
    }

    /**
     * Recursively extracts unqualified PHP identifiers from a type expression.
     * Handles union/intersection types, generics, array shapes, callable types, and array suffixes.
     * @param typeExpression The type expression to extract identifiers from
     * @returns Array of unqualified identifier name strings
     */
    private extractIdentifiersFromTypeExpression(typeExpression: string): string[] {
        const expression = this.normalizeTypeExpression(typeExpression);
        if (expression === "") {
            return [];
        }

        const splitExpressions = this.splitByTopLevelOperators(expression, ["|", "&"]);
        if (splitExpressions.length > 1) {
            return splitExpressions.flatMap((segment) => this.extractIdentifiersFromTypeExpression(segment));
        }

        let normalized = expression;
        while (normalized.endsWith("[]")) {
            normalized = normalized.slice(0, -2).trim();
        }

        if (normalized.includes("::")) {
            return this.extractIdentifiersFromTypeExpression(normalized.split("::")[0]);
        }

        const callableIdentifiers = this.extractCallableIdentifiers(normalized);
        if (callableIdentifiers !== null) {
            return callableIdentifiers;
        }

        const genericStart = this.findTopLevelCharacter(normalized, "<");
        if (genericStart !== -1 && normalized.endsWith(">")) {
            const baseType = normalized.slice(0, genericStart);
            const genericContent = normalized.slice(genericStart + 1, -1);

            return [
                ...this.extractIdentifiersFromTypeExpression(baseType),
                ...this.splitTopLevel(genericContent, ",").flatMap((segment) => this.extractIdentifiersFromTypeExpression(segment)),
            ];
        }

        const shapeStart = this.findTopLevelCharacter(normalized, "{");
        if (shapeStart !== -1 && normalized.endsWith("}")) {
            const baseType = normalized.slice(0, shapeStart);
            const shapeContent = normalized.slice(shapeStart + 1, -1);
            const valueTypes = this.splitTopLevel(shapeContent, ",").flatMap((segment) => {
                const colonIndex = this.findTopLevelCharacter(segment, ":");
                if (colonIndex === -1) {
                    return this.extractIdentifiersFromTypeExpression(segment);
                }

                return this.extractIdentifiersFromTypeExpression(segment.slice(colonIndex + 1));
            });

            return [...this.extractIdentifiersFromTypeExpression(baseType), ...valueTypes];
        }

        if (normalized.startsWith("\\")) {
            return [];
        }

        if (normalized.includes("\\")) {
            return [];
        }

        if (!PhpDocTypeExtractor.identifierRegExp.test(normalized)) {
            return [];
        }

        if (ReservedKeywords.has(normalized.toLowerCase())) {
            return [];
        }

        return [normalized];
    }

    /**
     * Attempts to extract identifiers from a callable-style type expression (e.g. `callable(Type): Return`).
     * @param typeExpression The type expression to inspect
     * @returns Array of identifiers if the expression is callable-like, or null if not
     */
    private extractCallableIdentifiers(typeExpression: string): string[] | null {
        const openParenIndex = this.findTopLevelCharacter(typeExpression, "(");
        if (openParenIndex === -1) {
            return null;
        }

        const closeParenIndex = this.findMatchingBracket(typeExpression, openParenIndex, "(", ")");
        if (closeParenIndex === -1) {
            return null;
        }

        const prefix = typeExpression.slice(0, openParenIndex).trim();
        const suffix = typeExpression.slice(closeParenIndex + 1).trim();
        if (suffix !== "" && !suffix.startsWith(":")) {
            return null;
        }

        const identifiers: string[] = [];
        if (prefix !== "") {
            identifiers.push(...this.extractIdentifiersFromTypeExpression(prefix));
        }

        const parameterList = typeExpression.slice(openParenIndex + 1, closeParenIndex);
        for (const parameter of this.splitTopLevel(parameterList, ",")) {
            identifiers.push(...this.extractIdentifiersFromTypeExpression(parameter));
        }

        if (suffix.startsWith(":")) {
            identifiers.push(...this.extractIdentifiersFromTypeExpression(suffix.slice(1)));
        }

        return identifiers;
    }

    /**
     * Normalizes a type expression by stripping outer parentheses/brackets, leading `?`, trailing `=`, and string literals.
     * @param typeExpression The raw type expression to normalize
     * @returns The cleaned type expression, or an empty string if it was a string literal
     */
    private normalizeTypeExpression(typeExpression: string): string {
        let expression = typeExpression.trim();
        while (
            expression.length >= 2 &&
            ((expression.startsWith("(") && expression.endsWith(")")) || (expression.startsWith("[") && expression.endsWith("]")))
        ) {
            expression = expression.slice(1, -1).trim();
        }

        while (expression.startsWith("?")) {
            expression = expression.slice(1).trim();
        }

        while (expression.endsWith("=")) {
            expression = expression.slice(0, -1).trim();
        }

        if ((expression.startsWith("'") && expression.endsWith("'")) || (expression.startsWith('"') && expression.endsWith('"'))) {
            return "";
        }

        return expression;
    }

    /**
     * Splits a type expression at top-level operators (e.g. `|`, `&`), respecting nested brackets.
     * @param expression The expression to split
     * @param operators The operator characters to split on
     * @returns Array of subexpressions
     */
    private splitByTopLevelOperators(expression: string, operators: string[]): string[] {
        const segments: string[] = [];
        let current = "";
        let angleDepth = 0;
        let braceDepth = 0;
        let bracketDepth = 0;
        let parenDepth = 0;

        for (const character of expression) {
            switch (character) {
                case "<":
                    angleDepth++;
                    break;
                case ">":
                    angleDepth = Math.max(0, angleDepth - 1);
                    break;
                case "{":
                    braceDepth++;
                    break;
                case "}":
                    braceDepth = Math.max(0, braceDepth - 1);
                    break;
                case "[":
                    bracketDepth++;
                    break;
                case "]":
                    bracketDepth = Math.max(0, bracketDepth - 1);
                    break;
                case "(":
                    parenDepth++;
                    break;
                case ")":
                    parenDepth = Math.max(0, parenDepth - 1);
                    break;
                default:
                    break;
            }

            const isTopLevel = angleDepth === 0 && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0;

            if (isTopLevel && operators.includes(character)) {
                if (current.trim() !== "") {
                    segments.push(current.trim());
                }
                current = "";
                continue;
            }

            current += character;
        }

        if (current.trim() !== "") {
            segments.push(current.trim());
        }

        return segments;
    }

    /**
     * Splits a type expression at top-level occurrences of a single delimiter, respecting nested brackets.
     * @param expression The expression to split
     * @param delimiter The single-character delimiter to split on
     * @returns Array of subexpressions
     */
    private splitTopLevel(expression: string, delimiter: string): string[] {
        const segments: string[] = [];
        let current = "";
        let angleDepth = 0;
        let braceDepth = 0;
        let bracketDepth = 0;
        let parenDepth = 0;

        for (const character of expression) {
            switch (character) {
                case "<":
                    angleDepth++;
                    break;
                case ">":
                    angleDepth = Math.max(0, angleDepth - 1);
                    break;
                case "{":
                    braceDepth++;
                    break;
                case "}":
                    braceDepth = Math.max(0, braceDepth - 1);
                    break;
                case "[":
                    bracketDepth++;
                    break;
                case "]":
                    bracketDepth = Math.max(0, bracketDepth - 1);
                    break;
                case "(":
                    parenDepth++;
                    break;
                case ")":
                    parenDepth = Math.max(0, parenDepth - 1);
                    break;
                default:
                    break;
            }

            const isTopLevel = angleDepth === 0 && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0;

            if (isTopLevel && character === delimiter) {
                segments.push(current.trim());
                current = "";
                continue;
            }

            current += character;
        }

        if (current.trim() !== "") {
            segments.push(current.trim());
        }

        return segments;
    }

    /**
     * Finds the index of the first top-level occurrence of a character, respecting nested brackets.
     * @param expression The expression to search
     * @param target The character to find
     * @returns The index of the character, or -1 if not found at top level
     */
    private findTopLevelCharacter(expression: string, target: string): number {
        let angleDepth = 0;
        let braceDepth = 0;
        let bracketDepth = 0;
        let parenDepth = 0;

        for (let index = 0; index < expression.length; index++) {
            const character = expression[index];
            const isTopLevel = angleDepth === 0 && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0;

            if (isTopLevel && character === target) {
                return index;
            }

            switch (character) {
                case "<":
                    angleDepth++;
                    break;
                case ">":
                    angleDepth = Math.max(0, angleDepth - 1);
                    break;
                case "{":
                    braceDepth++;
                    break;
                case "}":
                    braceDepth = Math.max(0, braceDepth - 1);
                    break;
                case "[":
                    bracketDepth++;
                    break;
                case "]":
                    bracketDepth = Math.max(0, bracketDepth - 1);
                    break;
                case "(":
                    parenDepth++;
                    break;
                case ")":
                    parenDepth = Math.max(0, parenDepth - 1);
                    break;
                default:
                    break;
            }
        }

        return -1;
    }

    /**
     * Finds the index of the last top-level occurrence of a character, respecting nested brackets.
     * @param expression The expression to search
     * @param target The character to find
     * @returns The index of the last top-level occurrence, or -1 if not found
     */
    private findLastTopLevelCharacter(expression: string, target: string): number {
        let angleDepth = 0;
        let braceDepth = 0;
        let bracketDepth = 0;
        let parenDepth = 0;
        let foundIndex = -1;

        for (let index = 0; index < expression.length; index++) {
            const character = expression[index];
            const isTopLevel = angleDepth === 0 && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0;

            if (isTopLevel && character === target) {
                foundIndex = index;
            }

            switch (character) {
                case "<":
                    angleDepth++;
                    break;
                case ">":
                    angleDepth = Math.max(0, angleDepth - 1);
                    break;
                case "{":
                    braceDepth++;
                    break;
                case "}":
                    braceDepth = Math.max(0, braceDepth - 1);
                    break;
                case "[":
                    bracketDepth++;
                    break;
                case "]":
                    bracketDepth = Math.max(0, bracketDepth - 1);
                    break;
                case "(":
                    parenDepth++;
                    break;
                case ")":
                    parenDepth = Math.max(0, parenDepth - 1);
                    break;
                default:
                    break;
            }
        }

        return foundIndex;
    }

    /**
     * Finds the index of the matching closing bracket for an opening bracket.
     * @param expression The expression to search
     * @param openIndex The index of the opening bracket
     * @param openBracket The opening bracket character
     * @param closeBracket The closing bracket character
     * @returns The index of the matching closing bracket, or -1 if not found
     */
    private findMatchingBracket(expression: string, openIndex: number, openBracket: string, closeBracket: string): number {
        let depth = 0;

        for (let index = openIndex; index < expression.length; index++) {
            const character = expression[index];
            if (character === openBracket) {
                depth++;
            }
            if (character === closeBracket) {
                depth--;
                if (depth === 0) {
                    return index;
                }
            }
        }

        return -1;
    }
}
