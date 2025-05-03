import { Container } from "./Container";
import { ContainerRegistry } from "./ContainerRegistry";
import { ContainerInterface } from "./interface/ContainerInterface";

/**
 * Factory for creating dependency injection container instances.
 */
export class ContainerFactory {
    /**
     * The singleton instance of the default container
     */
    private static defaultContainer: ContainerInterface | null = null;

    /**
     * Creates or returns the default container (singleton pattern).
     * Ensures that only one instance exists throughout the application.
     * @returns The default container instance with all standard services registered
     */
    public static createDefaultContainer(): ContainerInterface {
        if (!ContainerFactory.defaultContainer) {
            ContainerFactory.defaultContainer = new Container();
            ContainerFactory.registerDefaultServices(ContainerFactory.defaultContainer);
        }

        return ContainerFactory.defaultContainer;
    }

    /**
     * Creates a new empty container instance without pre-registered services.
     * @returns A new empty container instance
     */
    public static createEmptyContainer(): ContainerInterface {
        return new Container();
    }

    /**
     * Registers all default services defined in ContainerRegistry into the provided container.
     * @param container The container to register services in
     */
    private static registerDefaultServices(container: ContainerInterface): void {
        for (const toRegister of ContainerRegistry) {
            container.register(toRegister.constructor, toRegister.dependencies);
        }
    }
}
