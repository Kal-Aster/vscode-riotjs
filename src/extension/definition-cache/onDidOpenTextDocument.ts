import {
    TextDocument,
    window
} from "vscode";

import state from "../state";

import initializeDefinitionCache from "./initializeDefinitionCache";

export default async function onDidOpenTextDocument(
    document: TextDocument
) {
    if (document.languageId !== "riotjs") {
        return;
    }

    const editor = window.activeTextEditor;
    if (editor == null) {
        return;
    }

    state.outputChannel?.appendLine(`Initializing definition cache for ${document.uri}!`);
    await initializeDefinitionCache(
        document.uri.toString()
    );
}