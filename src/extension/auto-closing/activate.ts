import {
    workspace,
    ExtensionContext
} from "vscode";

import onDidChangeTextDocument from "./onDidChangeTextDocument";

export default function activateAutoClosing(context: ExtensionContext) {
    const config = workspace.getConfiguration("riotjs");
    const enableAutoClosing = config.get("enableAutoClosing");
    if (!enableAutoClosing) {
        return;
    }

    context.subscriptions.push(
        workspace.onDidChangeTextDocument(onDidChangeTextDocument)
    );
}