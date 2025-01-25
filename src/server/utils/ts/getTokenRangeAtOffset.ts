import ts from "typescript";

export default function getTokenRangeAtOffset(
    sourceFile: ts.SourceFile, offset: number
): {
    start: number,
    end: number
} | null {
    const scanner = ts.createScanner(
        ts.ScriptTarget.Latest,
        true,
        ts.LanguageVariant.Standard,
        sourceFile.text
    );

    let token = scanner.scan();
    while (token != ts.SyntaxKind.EndOfFileToken) {
        let start = scanner.getTokenStart();
        let end = scanner.getTokenEnd();
        token = scanner.scan();

        if (offset < start || offset >= end) {
            continue;
        }

        return { start, end };
    }

    return null;
}