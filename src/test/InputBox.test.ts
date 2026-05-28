import * as assert from "assert";
import * as vscode from "vscode";
import { InputBox } from "../service/input/model/InputBox";

class InputBoxTestDouble implements vscode.InputBox {
    public title = "";
    public step: number | undefined;
    public totalSteps: number | undefined;
    public enabled = true;
    public busy = false;
    public value = "";
    public valueSelection: readonly [number, number] | undefined;
    public placeholder: string | undefined;
    public password = false;
    public buttons: readonly vscode.QuickInputButton[] = [];
    public prompt: string | undefined;
    public validationMessage: string | vscode.InputBoxValidationMessage | undefined;
    public ignoreFocusOut = false;

    private acceptListener: (() => void) | undefined;
    private hideListener: (() => void) | undefined;
    private changeValueListener: ((value: string) => void) | undefined;

    public readonly onDidAccept: vscode.Event<void> = (listener: () => void) => {
        this.acceptListener = listener;
        return { dispose: () => {} };
    };

    public readonly onDidHide: vscode.Event<void> = (listener: () => void) => {
        this.hideListener = listener;
        return { dispose: () => {} };
    };

    public readonly onDidChangeValue: vscode.Event<string> = (listener: (value: string) => void) => {
        this.changeValueListener = listener;
        return { dispose: () => {} };
    };

    public readonly onDidTriggerButton: vscode.Event<vscode.QuickInputButton> = () => {
        return { dispose: () => {} };
    };

    public show(): void {}

    public hide(): void {
        this.hideListener?.();
    }

    public dispose(): void {}

    public fireAccept(): void {
        this.acceptListener?.();
    }

    public fireChangeValue(value: string): void {
        this.changeValueListener?.(value);
    }
}

suite("InputBox", () => {
    test("resolves undefined when hidden with warning validation message", async () => {
        const vscodeInputBox = new InputBoxTestDouble();
        vscodeInputBox.validationMessage = {
            message: "Filename contains characters that may cause issues",
            severity: vscode.InputBoxValidationSeverity.Warning,
        };

        const inputBox = new InputBox({}, vscodeInputBox);
        const input = inputBox.prompt();

        vscodeInputBox.hide();

        assert.strictEqual(await input, undefined);
    });

    test("does not resolve when hidden with error validation message", async () => {
        const vscodeInputBox = new InputBoxTestDouble();
        vscodeInputBox.validationMessage = {
            message: "Filename is invalid",
            severity: vscode.InputBoxValidationSeverity.Error,
        };

        const inputBox = new InputBox({}, vscodeInputBox);
        const input = inputBox.prompt();

        vscodeInputBox.hide();

        const timeout = new Promise<"timeout">((resolve) => {
            setTimeout(() => resolve("timeout"), 10);
        });

        assert.strictEqual(await Promise.race([input, timeout]), "timeout");
    });
});
