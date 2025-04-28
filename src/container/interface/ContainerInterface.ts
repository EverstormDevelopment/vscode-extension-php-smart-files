import { ConstructorType } from "../type/ConstructorInterface";

/**
 * Interface for a container that manages dependency injection
 */
export interface ContainerInterface {
    /**
     * Registers a class/service with optional auto-wiring
     * @param token The token to register the service under
     * @param constructor The service class constructor
     * @param dependencies The keys of the dependencies required by the service
     */
    register<T>(
        token: symbol,
        constructor: ConstructorType<T>,
        dependencies?: symbol[]
    ): void;

    /**
     * Gets a service from the container
     * @param token The token of the service to get
     * @returns The service instance
     */
    get<T>(token: symbol): T;

    /**
     * Checks if a service is registered in the container
     * @param token The token to check
     * @returns True if the service is registered, false otherwise
     */
    has(token: symbol): boolean;
}