/**
 * Enum representing the types of filesystem operations.
 */
export enum FilesystemObserverOperationEnum {
    /**
     * File was moved to a new location
     */
    Moved = "moved",

    /**
     * File was renamed in the same location
     */
    Renamed = "renamed",
}
