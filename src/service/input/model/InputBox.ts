import * as vscode from "vscode";
import { InputBoxInterface } from "../interface/InputInterface";
import { InputBoxOptionsType } from "../type/InputBoxOptionsType";

export class InputBox implements InputBoxInterface {

    private resolveInput: (value: string | undefined) => void = () => {};

    constructor(
        protected readonly options: InputBoxOptionsType = {},
        private readonly inputBox = vscode.window.createInputBox(),
    ) {
        this.configureUI();
        this.configureBehaviour();
    }

    private configureUI(): void {
        const { title, value, prompt, placeholder, password, ignoreFocusOut } = this.options;

        this.inputBox.title = title || "";
        this.inputBox.value = value || "";
        this.inputBox.prompt = prompt || "";
        this.inputBox.placeholder = placeholder || "";
        this.inputBox.password = password || false;
        this.inputBox.ignoreFocusOut = ignoreFocusOut || false;
    }

    private configureBehaviour(): void {
        this.configureOnChangeValue();
        this.configureOnAccept();
        this.configureOnHide();
    }

    private configureOnChangeValue(): void {
        this.inputBox.onDidChangeValue(async (value: string) => this.validate(value));
    }

    private configureOnAccept(): void {
        this.inputBox.onDidAccept(async () => {
            if(!this.resolveInput){
                throw new Error("No input resolver function provided.");
            }

            const value = this.inputBox.value;
            const isValueValid = await this.validate(value);
            if (isValueValid) {
                return;
            }

            const input = await this.processInput(value);            
            this.resolveInput(input);
            this.inputBox.hide();
        });
    }

    private configureOnHide(): void {
        this.inputBox.onDidHide(() => {
            if(!this.resolveInput){
                throw new Error("No input resolver function provided.");
            }

            if (this.inputBox.validationMessage) {
                return; // Don't resolve if hiding due to validation error
            }

            this.resolveInput(undefined);
        });
    }

    private async validate(value: string): Promise<boolean> {
        const validationMessage = await this.options.inputValidator?.validate(value) || "";
        this.inputBox.validationMessage = validationMessage;
        return validationMessage === "";
    }

    private async processInput(input: string): Promise<string> {
        return this.options.inputProcessor?.process(input) || input;
    }


    public async prompt(): Promise<string | undefined> {
        return new Promise<string | undefined>((resolve) => {
            this.resolveInput = resolve;
            this.inputBox.show();
        });
    }
}
