import { NamespaceValidatorInterface } from "../interface/NamespaceValidatorInterface";
import { NamespaceRegExpProvider } from "../provider/NamespaceRegExpProvider";

/**
 * Validates individual PHP namespace identifiers
 *
 * Uses regex patterns to check if namespace segments follow PHP naming rules
 * (e.g., "App", "Controller" in "App\Controller\UserController")
 */
export class NamespaceIdentifierValidator implements NamespaceValidatorInterface {
    /**
     * @param namespaceRegExpProvider Provides regex patterns for validation
     */
    constructor(private readonly namespaceRegExpProvider: NamespaceRegExpProvider) {}

    /**
     * Validates a namespace identifier segment
     * @param identifier Namespace segment to validate
     * @returns True if valid, false otherwise
     */
    public async validate(identifier: string): Promise<boolean> {
        const regExp = this.namespaceRegExpProvider.getIdentifierPatternRegExp();
        return regExp.test(identifier);
    }
}
