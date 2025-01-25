import {
    TextDocument,
    window
} from "vscode";

import state from "../state";

import scheduleDocumentToProcess from "./scheduleDocumentToProcess";

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

    state.outputChannel?.appendLine(`Schedule document ${document.uri} to process`);
    await scheduleDocumentToProcess(
        document.uri.toString()
    );
}