import { ConstructorType } from "../type/ConstructorInterface";

/**
 * Interface for a container that manages dependency injection
 */
export interface ContainerInterface {
    /**
     * Registers a class/service with optional auto-wiring
     * @param key The key to register the service under
     * @param constructor The service class constructor
     * @param dependencies The keys of the dependencies required by the service
     */
    register<T>(
        key: symbol,
        constructor: ConstructorType<T>,
        dependencies?: symbol[]
    ): void;

    /**
     * Gets a service from the container
     * @param key The key of the service to get
     * @returns The service instance
     */
    get<T>(key: symbol): T;

    /**
     * Checks if a service is registered in the container
     * @param key The key to check
     * @returns True if the service is registered, false otherwise
     */
    has(key: symbol): boolean;
}