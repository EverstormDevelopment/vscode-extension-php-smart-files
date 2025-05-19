import { NamespaceValidatorInterface } from "../interface/NamespaceValidatorInterface";
import { NamespaceRegExpProvider } from "../provider/NamespaceRegExpProvider";

export class NamespacePathValidator implements NamespaceValidatorInterface {
    constructor(
        private readonly namespaceRegExpProvider: NamespaceRegExpProvider,
    ) {}

    public async validate(namespace: string): Promise<boolean> {
        const regExp = this.namespaceRegExpProvider.getNamespacePatternRegExp();
        return regExp.test(namespace);
    }
}