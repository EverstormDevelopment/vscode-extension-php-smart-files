import * as vscode from "vscode";
import { ContainerFactory } from "../../../container/build/ContainerFactory";
import { GlobalReservedService } from "../../php/service/GlobalReservedService";
import { InputValidatorInterface } from "../interface/InputValidatorInterface";


export class InputDefinitionNameGlobalFunctionValidator implements InputValidatorInterface {

    public async validate(input: string): Promise<vscode.InputBoxValidationMessage | undefined> {
        const container = ContainerFactory.getDefaultContainer();
        const globalReservedService = container.get(GlobalReservedService);

        if (await globalReservedService.isGlobalFunction(input)) {
            return {
                message: vscode.l10n.t("Cannot use PHP global function name as definition name"),
                severity: vscode.InputBoxValidationSeverity.Error,
            };
        }
        return undefined;
    }
}
