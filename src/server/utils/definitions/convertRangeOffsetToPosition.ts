import ts from "typescript";

import { Range } from "vscode-languageserver/node";

export default function convertRangeOffsetToPosition(
    range: {
        start: number,
        end: number
    },
    sourceFile: ts.SourceFile
) {
    return Range.create(
        sourceFile.getLineAndCharacterOfPosition(range.start),
        sourceFile.getLineAndCharacterOfPosition(range.end)
    );
}