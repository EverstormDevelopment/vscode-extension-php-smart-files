import * as vscode from "vscode";
import { ContainerFactory } from '../../container/ContainerFactory';
import { ContainerInterface } from '../../container/interface/ContainerInterface';
import { ExtensionInterface } from "../interface/ExtensionInterface";
import { FileGenerationCommandRegistry } from "../registry/FileGenerationCommandRegistry";
import { FileGenerationCommand } from './../command/FileGenerationCommand';
import { FileTypeEnum } from "../../utils/enum/FileTypeEnum";

export class Extension implements ExtensionInterface {
    private id: string | undefined;
    private name: string | undefined;
    private version: string | undefined;
    private container: ContainerInterface;

    constructor() {
        this.container = ContainerFactory.createDefaultContainer();
    }

    public activate(context: vscode.ExtensionContext): this {
        this.initialize(context);
        this.addFileCreationCommands(context);
        
        return this;
    }

    private initialize(context: vscode.ExtensionContext): void {
        this.id = context.extension.id;
        this.name = context.extension.packageJSON.name;
        this.version = context.extension.packageJSON.version;
        
    }

    private addFileCreationCommands(context: vscode.ExtensionContext): void {
        const commandRegistry = FileGenerationCommandRegistry;        
        for (const [commandName, fileType] of Object.entries(commandRegistry)) {
            this.addFileCreationCommand(context, commandName, fileType);
        }
    }

    private addFileCreationCommand(context: vscode.ExtensionContext, commandName: string, fileType: FileTypeEnum): void {
        const commandId = `${this.name}.${commandName}`;
        const vscodeCommand = vscode.commands.registerCommand(commandId, 
            async (uri?: vscode.Uri) => {
                const fileGenerationCommand = this.container.get(FileGenerationCommand);
                await fileGenerationCommand.execute(fileType, uri);
            }
        );
        context.subscriptions.push(vscodeCommand);
    }

    public deactivate(): this {
        return this;
    }

}
