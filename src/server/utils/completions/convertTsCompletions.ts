import ts from "typescript";

import { CompletionItem, CompletionItemKind, CompletionList, InsertTextFormat, InsertTextMode, Position } from "vscode-languageserver";

import convertReplacementSpanToTextEdit from "./convertReplacementSpanToTextEdit";
import getCompletionEntryLabelAndLabelDetails from "./getCompletionEntryLabelAndLabelDetails";
import tsCompletionKindMap from "./tsCompletionKindMap";

export default function convertTsCompletions(
    completionInfo: ts.WithMetadata<ts.CompletionInfo> | null,
    text: string, scriptPosition: Position
): CompletionList {
    if (completionInfo == null) {
        return {
            isIncomplete: false,
            items: []
        };
    }

    const items = completionInfo.entries.map(entry => {
        const item: CompletionItem = {
            ...getCompletionEntryLabelAndLabelDetails(entry),
            detail: `(${entry.kind})`,
            kind: (
                tsCompletionKindMap[entry.kind] ||
                CompletionItemKind.Text
            ),
            documentation: undefined,
            sortText: entry.sortText,
            filterText: entry.filterText,
            insertText: entry.insertText || entry.name,
            insertTextFormat: (entry.isSnippet ?
                InsertTextFormat.Snippet :
                InsertTextFormat.PlainText
            ),
            insertTextMode: InsertTextMode.adjustIndentation,
            textEdit: convertReplacementSpanToTextEdit(
                entry.insertText || entry.name,
                entry.replacementSpan,
                text, scriptPosition
            ),
            data: entry.data
        };

        return item;
    });

    return {
        isIncomplete: completionInfo.isIncomplete || false,
        items
    };
}