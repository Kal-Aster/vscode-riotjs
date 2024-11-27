import { Position } from "vscode-languageserver-textdocument";

export default function positionAdd(
    positionA: Position,
    positionB: Position,
    isFirstLineOfBTheLastOneOfA = false
): Position {
    return {
        line: positionA.line + positionB.line - (
            isFirstLineOfBTheLastOneOfA ? 1 : 0
        ),
        character: positionB.character - (positionB.line === 0 ?
            positionA.character : 0
        )
    };
}