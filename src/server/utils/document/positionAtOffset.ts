import { Position } from "vscode-languageserver-textdocument";

export default function positionAtOffset(
    text: string, offset: number
): Position {
    let characterCount = 0;
    let lineCount = 0;
    for (let charIndex = 0; charIndex < text.length; charIndex++) {
        if (charIndex === offset) {
            break;
        }
        const char = text[charIndex];
        if (char === "\n") {
            lineCount++;
            characterCount = 0;
            continue;
        }
        characterCount++;
    }

    return {
        line: lineCount,
        character: characterCount
    };
}