import * as vscode from "vscode";
import { ExtensionInterface } from "./extension/interface/ExtensionInterface";
import { Extension } from "./extension/model/Extension";

/**
 * Reference to the extension instance, used for activation and deactivation.
 */
let extension: ExtensionInterface | undefined;

/**
 * This method is called when the extension is activated.
 * @param context The extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext) {
    extension = new Extension().activate(context);
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate() {
    if (!extension) {
        return;
    }

    extension.deactivate();
    extension = undefined;
}
