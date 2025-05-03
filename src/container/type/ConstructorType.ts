/**
 * Type definition for a constructor function used by the dependency injection container.
 * Represents any class constructor that can be instantiated with dependencies.
 * @template T The type of object that the constructor creates
 */
export type ConstructorType<T> = new (...args: any[]) => T;
