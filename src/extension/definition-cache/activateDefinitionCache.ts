import {
    workspace,
    ExtensionContext
} from "vscode";

import onDidChangeTextDocument from "./onDidChangeTextDocument";

export default function activateDefinitionCache(context: ExtensionContext) {
    context.subscriptions.push(
        workspace.onDidChangeTextDocument(onDidChangeTextDocument)
    );
}