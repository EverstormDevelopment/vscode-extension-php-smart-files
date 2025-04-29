import { ContainerInterface } from "./interface/ContainerInterface";
import { ConstructorType } from "./type/ConstructorInterface";

/**
 * Type definition for a registration
 */
type RegistrationType<T> = {
    instance?: T;
    constructor: ConstructorType<T>;
    dependencies?: symbol[];
};

/**
 * Implementation of the service container for dependency injection
 */
export class Container implements ContainerInterface {
    /**
     * The map of registered services
     */
    private services: Map<symbol, RegistrationType<any>> = new Map();

    /**
     * Registers a service class with optional auto-wiring
     * @param key The key to register the service under
     * @param constructor The service constructor
     * @param dependencies The keys of the dependencies required by the service
     */
    public register<T>(key: symbol, constructor: ConstructorType<T>, dependencies: symbol[]): void {
        this.services.set(key, {
            constructor,
            dependencies,
        });
    }

    /**
     * Gets a service from the container
     * @param key The key of the service to get
     * @returns The service instance
     * @throws Error if the service is not registered
     */
    public get<T>(key: symbol): T {
        if (!this.has(key)) {
            throw new Error(`Service ${key.toString()} not registered`);
        }

        const registration = this.services.get(key) as RegistrationType<T>;
        if (registration.instance !== undefined) {
            return registration.instance;
        }
        return this.createInstance<T>(key, registration);
    }

    /**
     * Creates an instance of a service, resolving its dependencies if necessary
     * @param key The key key
     * @param registration The service registration
     * @returns The created service instance
     */
    private createInstance<T>(key: symbol, registration: RegistrationType<T>): T {
        if (!registration.constructor) {
            throw new Error(`Constructor for service ${key.toString()} not defined`);
        }

        registration.dependencies?.map((depKey) => {
            if (!this.has(depKey)) {
                throw new Error(`Dependency ${depKey.toString()} not registered for service ${key.toString()}`);
            }
        });

        const resolvedDependencies = registration.dependencies?.map((depKey) => this.get(depKey)) ?? [];
        registration.instance = new registration.constructor(...resolvedDependencies);
        return registration.instance as T;
    }

    /**
     * Checks if a service is registered in the container
     * @param key The key to check
     * @returns True if the service is registered, false otherwise
     */
    public has(key: symbol): boolean {
        return this.services.has(key);
    }
}
