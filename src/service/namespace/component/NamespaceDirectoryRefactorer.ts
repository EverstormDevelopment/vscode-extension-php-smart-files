import * as vscode from "vscode";
import { getFilesInUriDirectory } from "../../../utils/filesystem/getFilesInUriDirectory";
import { NamespaceRefactorDetailsProvider } from "../provider/NamespaceRefactorDetailsProvider";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";
import { NamespaceFileRefactorer } from "./NamespaceFileRefactorer";

/**
 * Handles the refactoring of PHP namespaces across an entire directory.
 * This class processes all PHP files in a directory when a namespace change occurs,
 * updating references and namespace declarations accordingly.
 */
export class NamespaceDirectoryRefactorer {
    /**
     * Creates a new instance of the NamespaceDirectoryRefactorer.
     * @param namespaceRefactorDetailsProvider Provider that generates refactoring details for files
     * @param namespaceFileRefactorer Service responsible for refactoring individual PHP files
     */
    constructor(
        private readonly namespaceRefactorDetailsProvider: NamespaceRefactorDetailsProvider,
        private readonly namespaceFileRefactorer: NamespaceFileRefactorer
    ) {}

    /**
     * Refactors all PHP files in a directory structure to update namespace references and shows a
     * progress notification during the operation.
     * @param refactorDetails Details of the namespace changes to apply
     * @returns Promise that resolves when the refactoring is complete
     */
    public async refactor(refactorDetails: NamespaceRefactorDetailsType): Promise<void> {
        const options: vscode.ProgressOptions = {
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t(
                'Updating directory from "{0}" to "{1}"',
                refactorDetails.old.identifier,
                refactorDetails.new.identifier
            ),
        };

        await vscode.window.withProgress(options, async (progress) => {
            await this.refactorWithProgress(refactorDetails, progress);
        });
    }

    /**
     * Handles the refactoring process with progress reporting.
     * @param refactorDetails Details of the namespace changes to apply
     * @param progress Progress object for updating the notification
     * @returns Promise that resolves when refactoring is complete
     */
    private async refactorWithProgress(
        refactorDetails: NamespaceRefactorDetailsType,
        progress: vscode.Progress<{
            message?: string;
            increment?: number;
        }>
    ): Promise<void> {
        await this.refactorDirectoryWithProgress(refactorDetails, progress);
        // Intentional delay to ensure the notification is visible to the user
        // for a short period after the last file is processed.
        return new Promise((resolve) => {
            setTimeout(() => {
                progress.report({ increment: 100 });
                resolve();
            }, 1500);
        });
    }

    /**
     * Processes all PHP files in the target directory, updating namespace references and
     * reports progress for each file processed.
     * @param refactorDetails Details of the namespace changes to apply
     * @param progress Progress object for updating the notification
     * @returns Promise that resolves when directory processing is complete
     */
    private async refactorDirectoryWithProgress(
        refactorDetails: NamespaceRefactorDetailsType,
        progress: vscode.Progress<{
            message?: string;
            increment?: number;
        }>
    ): Promise<void> {
        const files = await getFilesInUriDirectory(refactorDetails.new.uri, "**/*.php");
        const progressIncrement = 99.9 / files.length;

        for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
            progress.report({
                increment: progressIncrement,
                message: vscode.l10n.t("Processing file {0} of {1}", fileIndex + 1, files.length),
            });

            const fileUri = files[fileIndex];
            await this.refactorFile(fileUri, refactorDetails);
        }
    }

    /**
     * Refactors an individual PHP file, updating its namespace references.
     * @param fileUri URI of the file to refactor in its new location
     * @param refactorDetails Overall namespace refactoring details
     * @returns Promise that resolves when the file is refactored
     */
    private async refactorFile(fileUri: vscode.Uri, refactorDetails: NamespaceRefactorDetailsType): Promise<void> {
        const oldUri = refactorDetails.old.uri;
        const newUri = refactorDetails.new.uri;

        const oldPath = fileUri.path.replace(newUri.path, oldUri.path);
        const oldFileUri = fileUri.with({ path: oldPath });

        const fileRefactorDetails = await this.namespaceRefactorDetailsProvider.get(oldFileUri, fileUri);
        await this.namespaceFileRefactorer.refactor(fileRefactorDetails);
    }
}
