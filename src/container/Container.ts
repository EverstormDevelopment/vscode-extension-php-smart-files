import { ContainerInterface } from "./interface/ContainerInterface";
import { ConstructorType } from "./type/ConstructorInterface";


/**
 * Type definition for a service registration
 */
type ServiceRegistration<T> = {
    instance?: T;
    constructor: ConstructorType<T>;
    dependencies?: symbol[];
    isInitialized: boolean;
};

/**
 * Implementation of the service container for dependency injection
 */
export class Container implements ContainerInterface {
    /**
     * The map of registered services
     */
    private services: Map<symbol, ServiceRegistration<any>> = new Map();

    /**
     * Registers a service class with optional auto-wiring
     * @param serviceKey The key to register the service under
     * @param constructor The service constructor
     * @param dependencies The keys of the dependencies required by the service
     */
    public register<T>(
        serviceKey: symbol,
        constructor: ConstructorType<T>,
        dependencies: symbol[]
    ): void {
        this.services.set(serviceKey, {
            constructor,
            dependencies,
            isInitialized: false
        });
    }

    /**
     * Gets a service from the container
     * @param serviceKey The key of the service to get
     * @returns The service instance
     * @throws Error if the service is not registered
     */
    public get<T>(serviceKey: symbol): T {
        if (!this.has(serviceKey)) {
            throw new Error(`Service ${serviceKey.toString()} not registered`);
        }
        
        const registration = this.services.get(serviceKey) as ServiceRegistration<T>;
        
        // Return instance if already initialized
        if (registration.isInitialized && registration.instance !== undefined) {
            return registration.instance;
        }

        this.initializeAutowiredService(serviceKey, registration);
        
        return registration.instance as T;
    }

    
    /**
     * Initialize an auto-wired service by resolving its dependencies
     * @param serviceKey The service key
     * @param registration The service registration
     */
    private initializeAutowiredService<T>(
        serviceKey: symbol,
        registration: ServiceRegistration<T>
    ): void {
        if (!registration.constructor) {
            throw new Error(`Constructor for service ${serviceKey.toString()} not defined`);
        }
        
        if (!registration.dependencies) {
            throw new Error(`Dependencies for service ${serviceKey.toString()} not defined`);
        }
        
        // Resolve all dependencies
        const resolvedDependencies = registration.dependencies.map(depKey => this.get(depKey));
        
        // Create instance with resolved dependencies
        registration.instance = new registration.constructor(...resolvedDependencies);
        registration.isInitialized = true;
    }

    /**
     * Checks if a service is registered in the container
     * @param serviceKey The key to check
     * @returns True if the service is registered, false otherwise
     */
    public has(serviceKey: symbol): boolean {
        return this.services.has(serviceKey);
    }
}