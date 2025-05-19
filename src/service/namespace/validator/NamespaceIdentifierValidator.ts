import { NamespaceValidatorInterface } from "../interface/NamespaceValidatorInterface";
import { NamespaceRegExpProvider } from "../provider/NamespaceRegExpProvider";

export class NamespaceIdenfifierValidator implements NamespaceValidatorInterface {
    constructor(
        private readonly namespaceRegExpProvider: NamespaceRegExpProvider,
    ) {}

    public async validate(identifier: string): Promise<boolean> {
        const regExp = this.namespaceRegExpProvider.getIdentifierPatternRegExp();
        return regExp.test(identifier);
    }
}