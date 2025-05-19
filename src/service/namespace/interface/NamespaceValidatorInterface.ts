export interface NamespaceValidatorInterface {
    validate(toValidate: string): Promise<boolean>;
}
