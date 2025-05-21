/**
 * Interface for PHP namespace validation
 *
 * This interface defines validators used to check the validity of PHP namespaces
 * or individual parts of a namespace (such as identifiers within fully qualified
 * namespace strings). Implementations may check against PSR-4 standards, syntax rules,
 * or project-specific constraints.
 */
export interface NamespaceValidatorInterface {
    /**
     * Validates a namespace string or namespace component
     * @param toValidate The string to validate (can be a complete namespace or a namespace component)
     * @returns A Promise<boolean> that resolves to true if valid, false otherwise
     */
    validate(toValidate: string): Promise<boolean>;
}
