import {
    TextDocumentContentChangeEvent,
    TextEditor,
    Selection
} from "vscode";

import getContentTypeAtCursor from "./getContentTypeAtCursor";
import getTagOpeningState from "./utils/getTagOpeningState";
import state from "./state";

const openingTagRegex = /<([\w-]+)(?:\s+[^<]*)*$/;

export default async function autoCloseTag(
    editor: TextEditor,
    change: TextDocumentContentChangeEvent
) {
    if (change.text !== ">" && change.text !== " ") {
        return;
    }

    const { document } = editor;

    const position = change.range.end;
    const offset = document.offsetAt(position);

    const contentType = await getContentTypeAtCursor(
        document.uri.toString(), offset
    );
    if (contentType !== "template") {
        return;
    }

    const text = document.getText();
    if (text.substring(offset - 2, offset) === "/>") {
        return;
    }

    const textBeforeCursor = text.substring(0, offset);
    const openingTagMatch = textBeforeCursor.match(openingTagRegex);
    if (openingTagMatch == null) {
        return;
    }
    
    const tagName = openingTagMatch[1];
    const index = openingTagMatch.index!;

    const textWithoutNewChar = `${textBeforeCursor}${text.substring(offset + 1)}`;

    const {
        finalState,
        stateAtOffset
    } = getTagOpeningState(
        offset, textWithoutNewChar,
        tagName, index
    );

    state.outputChannel?.appendLine(JSON.stringify({
        finalState,
        stateAtOffset
    }, null, 2));

    if (
        finalState.scope === undefined ||
        finalState.tagEndingCharIndex !== undefined
    ) {
        return;
    }
    if (
        stateAtOffset != null &&
        stateAtOffset.attributesCount !== finalState.attributesCount
    ) {
        return;
    }

    const insertText = (change.text === ">" ?
        `</${tagName}>` : `></${tagName}>`
    )
    const newPosition = position.translate(0, 1);
    await editor.edit((editBuilder) => {
        editBuilder.insert(newPosition, insertText);
    });

    editor.selection = new Selection(newPosition, newPosition);
}