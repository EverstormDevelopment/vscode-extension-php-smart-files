import { ContainerInterface } from "./interface/ContainerInterface";
import { ConstructorType } from "./type/ConstructorType";

/**
 * Type definition for a registration
 */
type RegistrationType<T> = {
    instance?: T;
    constructor: ConstructorType<T>;
    dependencies?: ConstructorType<any>[];
};

/**
 * Implementation of the service container for dependency injection
 */
export class Container implements ContainerInterface {
    /**
     * The map of registered services
     */
    private services: Map<ConstructorType<any>, RegistrationType<any>> = new Map();

    /**
     * Registers a service class with optional auto-wiring
     * @param constructor The service constructor
     * @param dependencies The constructors of the dependencies required by the service
     */
    public register<T>(constructor: ConstructorType<T>, dependencies: ConstructorType<any>[] = []): void {
        this.services.set(constructor, {
            constructor,
            dependencies,
        });
    }

    /**
     * Gets a service from the container
     * @param constructor The constructor of the service to get
     * @returns The service instance
     * @throws Error if the service is not registered
     */
    public get<T>(constructor: ConstructorType<T>): T {
        if (!this.has(constructor)) {
            throw new Error(`Service ${constructor.name} not registered`);
        }

        const registration = this.services.get(constructor) as RegistrationType<T>;
        if (registration.instance !== undefined) {
            return registration.instance;
        }
        return this.createInstance<T>(constructor, registration);
    }

    /**
     * Creates an instance of a service, resolving its dependencies if necessary
     * @param constructor The service constructor
     * @param registration The service registration
     * @returns The created service instance
     */
    private createInstance<T>(constructor: ConstructorType<T>, registration: RegistrationType<T>): T {
        registration.dependencies?.map((depConstructor) => {
            if (!this.has(depConstructor)) {
                throw new Error(`Dependency ${depConstructor.name} not registered for service ${constructor.name}`);
            }
        });

        const resolvedDependencies = registration.dependencies?.map((depConstructor) => this.get(depConstructor)) ?? [];
        registration.instance = new registration.constructor(...resolvedDependencies);
        return registration.instance as T;
    }

    /**
     * Checks if a service is registered in the container
     * @param constructor The constructor to check
     * @returns True if the service is registered, false otherwise
     */
    public has(constructor: ConstructorType<any>): boolean {
        return this.services.has(constructor);
    }
}
