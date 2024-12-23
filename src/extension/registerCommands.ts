import {
    commands,
    ExtensionContext
} from "vscode";

import logCompiledComponent from "./commands/logCompiledComponent";
import logContentTypeAtCursor from "./commands/logContentTypeAtCursor";
import logDeclaration from "./commands/logDeclaration";
import logExpressionScopeFunction from "./commands/logExpressionScopeFunction";
import logParsedComponent from "./commands/logParsedComponent";
import logProgramFiles from "./commands/logProgramFiles";
import logScriptContent from "./commands/logScriptContent";
import logSlots from "./commands/logSlots";
import logTypeAtCursor from "./commands/logTypeAtCursor";

export default function registerCommands(context: ExtensionContext) {
    [
        logCompiledComponent,
        logContentTypeAtCursor,
        function logInternalDeclaration() {
            logDeclaration("INTERNAL")
        },
        function logExternalDeclaration() {
            logDeclaration("EXTERNAL")
        },
        logExpressionScopeFunction,
        logParsedComponent,
        logProgramFiles,
        logScriptContent,
        logSlots,
        logTypeAtCursor
    ].forEach(commandFunction => {
        context.subscriptions.push(
            commands.registerCommand(
                `riotjs.${commandFunction.name}`,
                commandFunction
            )
        );
    });
}