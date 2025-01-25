import {
    TextDocumentContentChangeEvent,
    TextEditor,
    Selection
} from "vscode";

import getContentTypeAtCursor from "../getContentTypeAtCursor";
import state from "../state";

import shouldCloseTag from "../utils/shouldCloseTag";

const openingTagRegex = /<([\w-]+)(?:\s+[^<]*)*$/;

export default async function autoCloseTag(
    editor: TextEditor,
    change: TextDocumentContentChangeEvent
) {
    state.outputChannel?.appendLine(JSON.stringify({
        change,
        selection: editor.selection
    }, null, 2));
    if (change.text !== ">" && !change.text.match(/^\s+$/)) {
        return;
    }
    
    const { document } = editor;
    
    const offset = change.rangeOffset + change.text.length;
    
    state.outputChannel?.appendLine(JSON.stringify({
        offset
    }, null, 2));

    const contentType = await getContentTypeAtCursor(
        document.uri.toString(), offset
    );
    state.outputChannel?.appendLine(JSON.stringify({
        contentType
    }, null, 2));
    if (contentType !== "template") {
        return;
    }

    state.outputChannel?.appendLine("Checking autoclose");

    const text = document.getText();

    const result = shouldCloseTag(offset, text);
    state.outputChannel?.appendLine(JSON.stringify({
        result
    }, null, 2));
    if (!result.shouldClose) {
        return;
    }

    if (result.voidTag && result.hasOpeningTagClosingChar) {
        return;
    }

    if (result.suggestedIndex < offset) {
        const rangeSubstring = text.substring(
            result.suggestedIndex, offset
        );
        if (!rangeSubstring.match(/^\s*$/)) {
            return;
        }
    }

    const insertText = (!result.voidTag ?
        (result.hasOpeningTagClosingChar ?
            `</${result.tagName}>` : `></${result.tagName}>`
        ) : ">"
    )
    const insertPosition = document.positionAt(offset);
    state.outputChannel?.appendLine(JSON.stringify({
        insertPosition
    }, null, 2));
    await editor.edit((editBuilder) => {
        editBuilder.insert(insertPosition, insertText);
    });

    editor.selection = new Selection(
        insertPosition, insertPosition
    );
}