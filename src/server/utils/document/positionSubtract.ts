import { Position } from "vscode-languageserver-textdocument";

export default function positionSubtract(
    positionA: Position,
    positionB: Position,
): Position {
    const line = positionA.line - positionB.line;
    return {
        line,
        character: positionA.character - (line === 0 ?
            positionB.character : 0
        )
    };
}