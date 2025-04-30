import { AutoloadConfigType } from "./AutoloadConfigType";

/**
 * Contains the PSR-0 and PSR-4 autoloading configurations from composer.json
 * These define how PHP classes are mapped to file paths based on their namespaces
 */
export type AutoloadConfigsType = {
    psr4: AutoloadConfigType
    psr0: AutoloadConfigType
}
