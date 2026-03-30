import * as vscode from "vscode";
import { getPathNormalized } from "../../../utils/filesystem/getPathNormalized";
import { escapeRegExp } from "../../../utils/regexp/escapeRegExp";
import { getUseTypeByKind } from "../../php/function/getUseTypeByKind";
import { NamespaceRefactorerAbstract } from "../abstract/NamespaceRefactorerAbstract";
import { NameResolutionEnum } from "../enum/NameResolutionEnum";
import { PhpAstTraverser } from "../parser/PhpAstTraverser";
import { PhpParser } from "../parser/PhpParser";
import { IdentifierType } from "../type/IdentifierType";
import { NameReferenceType } from "../type/NameReferenceType";
import { NamespaceRefactorDetailsType } from "../type/NamespaceRefactorDetailsType";
import { OffsetLocType } from "../type/OffsetLocType";

/**
 * Handles refactoring of namespace references across multiple PHP files when a file
 * with a namespace is moved or renamed.
 */
export class NamespaceReferencesRefactorer extends NamespaceRefactorerAbstract {
    /**
     * Processes namespace reference updates across the workspace.
     * @param refactorDetails Contains information about the old and new namespace/identifier values
     * @returns Promise resolving to true if refactoring was performed, false otherwise
     */
    public async refactor(refactorDetails: NamespaceRefactorDetailsType): Promise<boolean> {
        if (!refactorDetails.hasNamespaces || !refactorDetails.hasChanged) {
            return false;
        }

        await this.startUpdateReferences(refactorDetails);
        return true;
    }

    /**
     * Displays a progress notification while updating references in all relevant files.
     * @param refactorDetails Contains information about the namespaces and identifiers to be updated
     */
    private async startUpdateReferences(refactorDetails: NamespaceRefactorDetailsType): Promise<void> {
        const options: vscode.ProgressOptions = {
            cancellable: false,
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t(
                'Updating references from "{0}" to "{1}"',
                refactorDetails.old.namespace,
                refactorDetails.new.namespace
            ),
        };

        await vscode.window.withProgress(options, async (progress) => {
            await this.progressUpdateReferences(progress, refactorDetails);
        });
    }

    /**
     * Performs the actual reference updates with progress reporting.
     * @param progress The VS Code Progress object for displaying progress
     * @param refactorDetails Contains information about the namespaces and identifiers to be updated
     */
    private async progressUpdateReferences(
        progress: vscode.Progress<{
            message?: string;
            increment?: number;
        }>,
        refactorDetails: NamespaceRefactorDetailsType
    ): Promise<void> {
        const files = await this.findFilesToRefactor(refactorDetails.new.uri);
        const progressIncrement = 100 / files.length;
        const processPromises: Promise<void>[] = [];

        let completed = 0;
        for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
            const fileUri = files[fileIndex];
            const promise = this.updateReference(fileUri, refactorDetails).then(() => {
                completed++;
                progress.report({
                    increment: progressIncrement,
                    message: vscode.l10n.t("Processing file {0} of {1}", completed, files.length),
                });
            });
            processPromises.push(promise);
        }

        await Promise.all(processPromises);
    }

    /**
     * Updates namespace references in a single file.
     * Parses the AST once, collects all FQN + PQN replacements for all identifiers,
     * applies them in reverse offset order, then handles use statement changes.
     * @param uri The URI of the file to update
     * @param refactorDetails Contains information about the old and new namespace/identifier values
     */
    private async updateReference(uri: vscode.Uri, refactorDetails: NamespaceRefactorDetailsType): Promise<void> {
        try {
            const fileContent = await this.getFileContent(uri);
            const fileNamespace = new PhpParser(fileContent).getNamespace();
            if (!fileNamespace) {
                return;
            }

            let fileContentUpdated = fileContent;
            fileContentUpdated = this.refactorReferences(fileContentUpdated, fileNamespace, refactorDetails);
            fileContentUpdated = this.refactorFileIdentifier(fileContentUpdated, fileNamespace, refactorDetails);
            if (fileContentUpdated === fileContent) {
                return;
            }

            fileContentUpdated = this.orderUseStatements(fileContentUpdated);
            await this.setFileContent(uri, fileContentUpdated);
        } catch (error) {
            const errorDetails = error instanceof Error ? error.message : String(error);
            const errorMessage = vscode.l10n.t("Error updating references in file {0}: {1}", uri.fsPath, errorDetails);
            vscode.window.showErrorMessage(errorMessage);
        }
    }

    /**
     * Applies all namespace reference updates for all identifiers in the refactor details.
     * Step 1: Parse AST once and batch-collect all FQN + PQN body replacements.
     * Step 2: Apply body replacements in reverse offset order (preserves subsequent offsets).
     * Step 3: Apply use statement changes sequentially (each re-parses the updated content).
     * @param content The file content to process
     * @param fileNamespace The namespace of the file being processed
     * @param refactorDetails Contains information about the old and new namespace/identifier values
     * @returns Updated file content
     */
    private refactorReferences(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): string {
        const oldNamespace = refactorDetails.old.namespace;
        const newNamespace = refactorDetails.new.namespace;
        const identifiers = refactorDetails.identifiers;

        // Step 1: Parse once and collect all body replacements for all identifiers
        const allRefs = new PhpAstTraverser(new PhpParser(content).getAST()).getNameReferences(false);
        const replacements: Array<{ loc: OffsetLocType; newText: string }> = [];

        for (const identifier of identifiers) {
            this.collectFqnReplacements(allRefs, fileNamespace, oldNamespace, newNamespace, identifier, replacements);
            this.collectPqnReplacements(allRefs, fileNamespace, oldNamespace, newNamespace, identifier, replacements);
        }

        // Step 2: Apply body replacements in reverse offset order
        replacements.sort((a, b) => b.loc.start - a.loc.start);
        const applied = new Set<number>();
        for (const { loc, newText } of replacements) {
            if (applied.has(loc.start)) {
                continue;
            }
            applied.add(loc.start);
            content = content.slice(0, loc.start) + newText + content.slice(loc.end);
        }

        // Step 3: Use statement changes — sequential, each call re-parses the updated content
        for (const identifier of identifiers) {
            content = this.refactorUseStatement(content, fileNamespace, oldNamespace, newNamespace, identifier);
        }

        return content;
    }

    /**
     * Updates references to the file identifier (class/interface/trait name) if it has changed.
     * @param content The file content to process
     * @param fileNamespace The namespace of the file being processed
     * @param refactorDetails Contains information about the old and new namespace/identifier values
     * @returns Updated file content with refactored identifiers
     */
    private refactorFileIdentifier(
        content: string,
        fileNamespace: string,
        refactorDetails: NamespaceRefactorDetailsType
    ): string {
        if (!refactorDetails.hasFileIdentifierChanged) {
            return content;
        }
        return this.refactorIdentifier(content, fileNamespace, refactorDetails);
    }

    /**
     * Collects FQN replacement entries for a single identifier.
     * Transforms `\Old\Ns\Class` → `\New\Ns\Class`, or to just the class name if same namespace.
     * @param allRefs All name references from the AST traversal
     * @param fileNamespace The namespace of the file being processed
     * @param oldNamespace The original namespace that was changed
     * @param newNamespace The new namespace value
     * @param identifier The identifier to collect replacements for
     * @param replacements Accumulator for replacement entries
     */
    private collectFqnReplacements(
        allRefs: NameReferenceType[],
        fileNamespace: string,
        oldNamespace: string,
        newNamespace: string,
        identifier: IdentifierType,
        replacements: Array<{ loc: OffsetLocType; newText: string }>
    ): void {
        const oldFQNName = `${oldNamespace}\\${identifier.name}`;
        const isSameNamespace = fileNamespace === newNamespace;
        const newText = isSameNamespace ? identifier.name : `\\${newNamespace}\\${identifier.name}`;

        for (const ref of allRefs) {
            if (ref.resolution !== NameResolutionEnum.Fqn || ref.name !== oldFQNName) {
                continue;
            }
            replacements.push({ loc: ref.loc, newText });
        }
    }

    /**
     * Collects PQN replacement entries for a single identifier.
     * Expands the partial reference using the file namespace and matches against the old FQN.
     * Replaces with the appropriate form based on namespace relationship.
     * @param allRefs All name references from the AST traversal
     * @param fileNamespace The namespace of the file being processed
     * @param oldNamespace The original namespace that was changed
     * @param newNamespace The new namespace value
     * @param identifier The identifier to collect replacements for
     * @param replacements Accumulator for replacement entries
     */
    private collectPqnReplacements(
        allRefs: NameReferenceType[],
        fileNamespace: string,
        oldNamespace: string,
        newNamespace: string,
        identifier: IdentifierType,
        replacements: Array<{ loc: OffsetLocType; newText: string }>
    ): void {
        const oldFQNFull = `\\${oldNamespace}\\${identifier.name}`;
        const newFQNFull = `\\${newNamespace}\\${identifier.name}`;
        const isSameNamespace = fileNamespace === newNamespace;
        const escapedFileNamespace = escapeRegExp(`${fileNamespace}\\`);
        const subNamespaceRegExp = new RegExp(`^${escapedFileNamespace}`, "u");

        for (const ref of allRefs) {
            if (ref.resolution !== NameResolutionEnum.Qn) {
                continue;
            }
            const expandedFQN = `\\${fileNamespace}\\${ref.name}`;
            if (expandedFQN !== oldFQNFull) {
                continue;
            }

            let newText: string;
            if (isSameNamespace) {
                newText = identifier.name;
            } else if (subNamespaceRegExp.test(newNamespace)) {
                const relNs = newNamespace.replace(subNamespaceRegExp, "");
                newText = `${relNs}\\${identifier.name}`;
            } else {
                newText = newFQNFull;
            }

            replacements.push({ loc: ref.loc, newText });
        }
    }

    /**
     * Manages use statement changes for a single identifier based on namespace relationships.
     * Adds a use statement when the file was in the old namespace,
     * removes when in the new namespace, and always replaces any existing old-namespace import.
     * @param content The file content to process
     * @param fileNamespace The namespace of the file being processed
     * @param oldNamespace The original namespace that was changed
     * @param newNamespace The new namespace value
     * @param identifier The identifier whose use statement should be managed
     * @returns Updated file content
     */
    private refactorUseStatement(
        content: string,
        fileNamespace: string,
        oldNamespace: string,
        newNamespace: string,
        identifier: IdentifierType
    ): string {
        const hasNamespaceChange = oldNamespace !== newNamespace;
        if (fileNamespace === oldNamespace && hasNamespaceChange) {
            content = this.addReferenceUseStatement(content, newNamespace, identifier);
        } else if (fileNamespace === newNamespace) {
            content = this.removeReferenceUseStatement(content, oldNamespace, identifier);
        }

        return this.replaceReferenceUseStatement(content, oldNamespace, newNamespace, identifier);
    }

    /**
     * Adds a use statement for the identifier if it appears in the content.
     * Uses a word-boundary regex to verify the identifier is actually referenced.
     * @param content The file content to process
     * @param newNamespace The new namespace value to add in the use statement
     * @param identifier The identifier to add a use statement for
     * @returns Updated file content with added use statement (if needed)
     */
    private addReferenceUseStatement(content: string, newNamespace: string, identifier: IdentifierType): string {
        const hasIdentifierRegExp = this.namespaceRegExpProvider.getIdentifierRegExp(identifier.name);
        if (!hasIdentifierRegExp.test(content)) {
            return content;
        }
        return this.addUseStatement(content, newNamespace, identifier);
    }

    /**
     * Removes a use statement for the identifier if it exists in the content.
     * @param content The file content to process
     * @param oldNamespace The namespace to remove from the use statement
     * @param identifier The identifier whose use statement should be removed
     * @returns Updated file content with removed use statement
     */
    private removeReferenceUseStatement(content: string, oldNamespace: string, identifier: IdentifierType): string {
        return this.removeUseStatement(content, oldNamespace, identifier);
    }

    /**
     * Replaces an existing use statement referencing the old namespace with one referencing the new namespace.
     * Preserves any alias. Uses AST-parsed use statement position for offset-based replacement.
     * @param content The file content to process
     * @param oldNamespace The original namespace that was changed
     * @param newNamespace The new namespace value
     * @param identifier The identifier whose use statement should be replaced
     * @returns Updated file content with replaced use statement
     */
    private replaceReferenceUseStatement(
        content: string,
        oldNamespace: string,
        newNamespace: string,
        identifier: IdentifierType
    ): string {
        const oldFQN = `${oldNamespace}\\${identifier.name}`;
        const newFQN = `${newNamespace}\\${identifier.name}`;

        const useStatements = new PhpParser(content).getUseStatements();
        const stmt = this.findUseStatement(useStatements, oldFQN, identifier);
        if (!stmt) {
            return content;
        }

        const useType = getUseTypeByKind(identifier.kind);
        const alias = stmt.alias ? ` as ${stmt.alias}` : "";
        const newUseStatement = `use ${useType}${newFQN}${alias};`;

        return content.slice(0, stmt.loc.start) + newUseStatement + content.slice(stmt.loc.end);
    }

    /**
     * Finds all PHP files in the workspace that might need reference updates.
     * Excludes the file being refactored and any directories configured to be excluded.
     * @param fileUri The URI of the file being refactored.
     * @returns Array of URIs for PHP files that might need updates.
     */
    private async findFilesToRefactor(fileUri: vscode.Uri): Promise<vscode.Uri[]> {
        const config = vscode.workspace.getConfiguration("phpSmartFiles");
        const excludedFolders = config.get<string[]>("refactorNamespacesExcludeDirectories", []);

        const relativeFilePath = vscode.workspace.asRelativePath(fileUri.fsPath);
        const excludedFile = getPathNormalized(relativeFilePath);

        const excludePattern = `{${[...excludedFolders, excludedFile].join(",")}}`;
        return vscode.workspace.findFiles("**/*.php", excludePattern);
    }
}
