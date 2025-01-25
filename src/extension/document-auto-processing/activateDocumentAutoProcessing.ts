import {
    workspace,
    ExtensionContext
} from "vscode";

import onDidOpenTextDocument from "./onDidOpenTextDocument";
import onDidChangeTextDocument from "./onDidChangeTextDocument";

export default function activateDocumentAutoProcessing(context: ExtensionContext) {
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