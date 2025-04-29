import { ConstructorType } from "../type/ConstructorType";

/**
 * Interface for the service container
 */
export interface ContainerInterface {
    /**
     * Registers a service in the container
     * @param constructor The constructor of the service to register
     * @param dependencies The constructors of the dependencies for the service
     */
    register<T>(constructor: ConstructorType<T>, dependencies?: ConstructorType<any>[]): void;
    
    /**
     * Gets a service instance from the container
     * @param constructor The constructor of the service to get
     * @returns The service instance
     */
    get<T>(constructor: ConstructorType<T>): T;
    
    /**
     * Checks if a service is registered
     * @param constructor The constructor to check
     * @returns True if the service is registered, false otherwise
     */
    has(constructor: ConstructorType<any>): boolean;
}