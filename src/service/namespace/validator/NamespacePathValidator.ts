import { NamespaceValidatorInterface } from "../interface/NamespaceValidatorInterface";
import { NamespaceRegExpProvider } from "../provider/NamespaceRegExpProvider";

/**
 * Validates complete PHP namespace paths
 *
 * Uses regex patterns to ensure full namespace strings meet PSR-4 standards
 * (e.g., "App\Controller\UserController" as a complete namespace)
 */
export class NamespacePathValidator implements NamespaceValidatorInterface {
    /**
     * @param namespaceRegExpProvider Provides regex patterns for validation
     */
    constructor(
        private readonly namespaceRegExpProvider: NamespaceRegExpProvider,
    ) {}

    /**
     * Validates a complete namespace path
     * @param namespace The full namespace string to validate
     * @returns True if valid, false otherwise
     */
    public async validate(namespace: string): Promise<boolean> {
        const regExp = this.namespaceRegExpProvider.getNamespacePatternRegExp();
        return regExp.test(namespace);
    }
}