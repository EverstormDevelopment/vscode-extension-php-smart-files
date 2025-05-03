/**
 * Normalizes a file system path by replacing backslashes with forward slashes
 * and removing trailing slashes for consistent path handling across platforms.
 * @param path - The file system path to normalize
 * @returns The normalized path with forward slashes and no trailing slash
 */
export function getPathNormalized(path: string): string {
    const normalizedPath = path.replace(/\\/g, "/");
    return normalizedPath.replace(/\/$/, "");
}