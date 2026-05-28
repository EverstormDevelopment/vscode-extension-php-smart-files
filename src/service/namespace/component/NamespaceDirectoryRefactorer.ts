import path from "path";
import * as vscode from "vscode";
import { getExcludePattern } from "../../../utils/filesystem/getExcludePattern";
import { getPathNormalized } from "../../../utils/filesystem/getPathNormalized";
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
        private readonly namespaceFileRefactorer: NamespaceFileRefactorer,
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
            title: vscode.l10n.t('Updating directory from "{0}" to "{1}"', refactorDetails.old.fileIdentifier.name, refactorDetails.new.fileIdentifier.name),
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
        }>,
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
        }>,
    ): Promise<void> {
        const files = await this.findFilesToRefactor(refactorDetails.new.uri);
        if (files.length === 0) {
            return;
        }

        const progressIncrement = 99.9 / files.length;
        let skippedFiles = 0;

        for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
            progress.report({
                increment: progressIncrement,
                message: vscode.l10n.t("Processing file {0} of {1}", fileIndex + 1, files.length),
            });

            const fileUri = files[fileIndex];
            skippedFiles += await this.refactorFile(fileUri, refactorDetails);
        }

        if (skippedFiles > 0) {
            const message = vscode.l10n.t(
                "Skipped namespace refactoring in {0} file(s) because they use PHP syntax that is not fully supported yet.",
                skippedFiles,
            );
            vscode.window.showWarningMessage(message);
        }
    }

    /**
     * Finds PHP files in the target directory and applies the namespace refactor exclude settings.
     * @param directoryUri Directory to search in
     * @returns Promise that resolves to all PHP file URIs that should be refactored
     */
    private async findFilesToRefactor(directoryUri: vscode.Uri): Promise<vscode.Uri[]> {
        const config = vscode.workspace.getConfiguration("phpSmartFiles");
        const excludedFolders = config.get<string[]>("refactorNamespacesExcludeDirectories", []);
        const excludePattern = getExcludePattern(excludedFolders);

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(directoryUri);
        if (!workspaceFolder) {
            return [];
        }

        const relativeDirectoryPath = getPathNormalized(path.relative(workspaceFolder.uri.fsPath, directoryUri.fsPath));
        const includePattern = relativeDirectoryPath ? `${relativeDirectoryPath}/**/*.php` : "**/*.php";

        return vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, includePattern), excludePattern);
    }

    /**
     * Refactors an individual PHP file, updating its namespace references.
     * @param fileUri URI of the file to refactor in its new location
     * @param refactorDetails Overall namespace refactoring details
     * @returns Promise that resolves when the file is refactored
     */
    private async refactorFile(fileUri: vscode.Uri, refactorDetails: NamespaceRefactorDetailsType): Promise<number> {
        const oldUri = refactorDetails.old.uri;
        const newUri = refactorDetails.new.uri;

        const relativeFilePath = path.relative(newUri.fsPath, fileUri.fsPath);
        const oldFilePath = path.join(oldUri.fsPath, relativeFilePath);
        const oldFileUri = vscode.Uri.file(oldFilePath);

        const fileRefactorDetails = await this.namespaceRefactorDetailsProvider.get(oldFileUri, fileUri);
        if (!fileRefactorDetails.isParseable) {
            return 1;
        }

        await this.namespaceFileRefactorer.refactor(fileRefactorDetails);
        return 0;
    }
}
