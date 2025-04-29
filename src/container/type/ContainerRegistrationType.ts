import { ConstructorType } from "./ConstructorInterface";

export type ContainerRegistrationType = {
    /**
     * The key for the service to be registered
     */
    key: symbol;

    /**
     * The constructor of the service to be registered
     */
    constructor: ConstructorType<any>;

    /**
     * The keys of the dependencies required by the service
     */
    dependencies?: symbol[];
};