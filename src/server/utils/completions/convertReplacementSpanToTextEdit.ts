import ts from "typescript";

import { Position, TextEdit } from "vscode-languageserver-textdocument";

import positionAtOffset from "../document/positionAtOffset";
import positionAdd from "../document/positionAdd";

export default function convertReplacementSpanToTextEdit(
    newText: string,
    replacementSpan: ts.TextSpan | undefined,
    text: string, scriptPosition: Position
): TextEdit | undefined {
    if (replacementSpan == null) {
        return undefined;
    }

    const start = positionAdd(
        scriptPosition,
        positionAtOffset(text, replacementSpan.start)
    );
    const end = positionAdd(
        scriptPosition,
        positionAtOffset(
            text, replacementSpan.start + replacementSpan.length
        )
    );

    return {
        newText,
        range: {
            start, end
        }
    };
}