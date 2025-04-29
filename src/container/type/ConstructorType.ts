/**
 * Type definition for a constructor used by the container
 * to create a new instance of a service class.
 */
export type ConstructorType<T> = new (...args: any[]) => T;
