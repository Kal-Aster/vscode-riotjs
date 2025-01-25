import {
    TextDocumentChangeEvent,
    window
} from "vscode";

import invalidateDefinitionCacheAtRange from "./invalidateDefinitionCacheAtRange";

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

    const change = event.contentChanges[0];
    await invalidateDefinitionCacheAtRange(
        document.uri.toString(),
        {
            start: document.offsetAt(change.range.start),
            end: document.offsetAt(change.range.end)
        },
        change.text
    );
}