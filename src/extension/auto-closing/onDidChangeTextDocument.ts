import {
    TextDocumentChangeEvent,
    window
} from "vscode";

import autoCloseTag from "./autoCloseTag";

export default async function onDidChangeTextDocument(
    event: TextDocumentChangeEvent
) {
    if (event.contentChanges.length === 0) return;

    const editor = window.activeTextEditor;
    if (!editor || editor.document !== event.document || editor.document.languageId !== "riotjs") {
        return;
    }

    const change = event.contentChanges[0];
    await autoCloseTag(editor, change);
}