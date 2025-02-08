import ts from "typescript";

import RiotDocument from "../../core/riot-documents/RiotDocument";
import touchRiotDocument from "../../core/riot-documents/touch";

import getFSExistingSourceFile from "../getFSExistingSourceFile";

import OffsetReferenceResult from "./OffsetReferenceResult";

function addScriptOffsetToRange(
    range: {
        start: number,
        end: number
    },
    riotDocument: RiotDocument | null,
    sourceFilePath: string
) {
    const parserResult = riotDocument?.getParserResult();
    if (
        riotDocument == null ||
        parserResult?.output.javascript?.text == null
    ) {
        return { start: 0, end: 0};
    }

    if (sourceFilePath !== riotDocument.filePath) {
        // here should use source map of declaration to map to actual position
        return { start: 0, end: 0};
    }

    const { start } = parserResult.output.javascript.text;

    return {
        start: range.start + start,
        end: range.end + start
    };
}

export default function mapReferences(
    references: readonly ts.ReferenceEntry[],
    program: ts.Program,
    riotDocument: RiotDocument
) {
    const { filePath } = riotDocument;

    return references.map(reference => {
        const sourceFile = getFSExistingSourceFile(
            reference.fileName, program
        );
        if (sourceFile == null) {
            if (!reference.fileName.endsWith(".riot.d.ts")) {
                return null;
            }

            const riotDocument = touchRiotDocument(
                reference.fileName.replace(/.riot.d.ts$/, ".riot"), null
            );
            if (riotDocument == null) {
                return null;
            }

            return {
                path: filePath,
                range: { start: 0, end: 0 }
            } as OffsetReferenceResult;
        }

        let range: {
            start: number,
            end: number
        };
        if (sourceFile.fileName.endsWith(".riot")) {
            const referenceRiotDocument = (sourceFile.fileName === filePath ?
                riotDocument : touchRiotDocument(sourceFile.fileName, null)
            );
            range = addScriptOffsetToRange({
                start: reference.textSpan.start,
                end: reference.textSpan.start + reference.textSpan.length
            }, referenceRiotDocument, sourceFile.fileName);
        } else {
            range = {
                start: reference.textSpan.start,
                end: reference.textSpan.start + reference.textSpan.length
            };
        }

        return {
            path: sourceFile.fileName,
            range
        } as OffsetReferenceResult;
    }).filter(def => def != null);
}