import { ConstructorType } from "./ConstructorInterface";

export type ContainerRegistrationType = {
    /**
     * The token for the service/class to be registered
     */
    token: symbol;

    /**
     * The constructor of the service/class to be registered
     */
    constructor: ConstructorType<any>;

    /**
     * The tokens of the dependencies required by the service
     */
    dependencies?: symbol[];
};