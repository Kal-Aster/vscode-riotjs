import {
    TextDocumentChangeEvent,
    window
} from "vscode";
import state from "../state";

export default async function onDidChangeTextDocument(
    event: TextDocumentChangeEvent
) {
    if (event.contentChanges.length === 0) {
        return;
    }

    const editor = window.activeTextEditor;
    if (editor == null) {
        return;
    }

    const { document } = editor;
    if (
        document !== event.document ||
        document.languageId !== "riotjs"
    ) {
        return;
    }

    if (state.riotClient == null) {
        return;
    }

    return await state.riotClient.sendRequest(
        "custom/scheduleDocumentToProcess", {
            uri: document.uri.toString()
        }
    ) as void;
}