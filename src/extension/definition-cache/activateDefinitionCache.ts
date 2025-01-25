import {
    workspace,
    ExtensionContext
} from "vscode";

import onDidChangeTextDocument from "./onDidChangeTextDocument";
import onDidOpenTextDocument from "./onDidOpenTextDocument";

export default function activateDefinitionCache(context: ExtensionContext) {
    workspace.textDocuments.forEach(document => {
        onDidOpenTextDocument(document);
    });
    context.subscriptions.push(
        workspace.onDidOpenTextDocument(onDidOpenTextDocument)
    );
    context.subscriptions.push(
        workspace.onDidChangeTextDocument(onDidChangeTextDocument)
    );
}