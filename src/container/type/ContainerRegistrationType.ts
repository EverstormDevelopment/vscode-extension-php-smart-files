import { ConstructorType } from "./ConstructorType";

/**
 * Type definition for container service registration entries.
 */
export type ContainerRegistrationType = {
    /**
     * The constructor of the service to be registered
     */
    constructor: ConstructorType<any>;

    /**
     * The constructors of the dependencies required by the service
     */
    dependencies?: ConstructorType<any>[];
};
