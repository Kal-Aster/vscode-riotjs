import ts from "typescript";

import RiotDocument from "../../core/riot-documents/RiotDocument";
import touchRiotDocument from "../../core/riot-documents/touch";

import getFSExistingSourceFile from "../getFSExistingSourceFile";

import OffsetDefinitionResult from "./OffsetDefinitionResult";

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

export default function mapDefinitions(
    definitions: readonly ts.DefinitionInfo[],
    program: ts.Program,
    riotDocument: RiotDocument,
    originSelectionRange?: {
        start: number,
        end: number
    }
) {
    const { filePath } = riotDocument;

    return definitions.map(definition => {
        const sourceFile = getFSExistingSourceFile(
            definition.fileName, program
        );
        if (sourceFile == null) {
            if (!definition.fileName.endsWith(".riot.d.ts")) {
                return null;
            }

            const riotDocument = touchRiotDocument(
                definition.fileName.replace(/.riot.d.ts$/, ".riot"), null
            );
            if (riotDocument == null) {
                return null;
            }

            return {
                path: filePath,
                targetRange: { start: 0, end: 0 },
                originSelectionRange
            } as OffsetDefinitionResult;
        }

        let targetRange: {
            start: number,
            end: number
        };
        let targetSelectionRange: {
            start: number,
            end: number
        } | undefined = undefined;
        if (sourceFile.fileName.endsWith(".riot")) {
            const definitionRiotDocument = (sourceFile.fileName === filePath ?
                riotDocument : touchRiotDocument(sourceFile.fileName, null)
            );
            targetRange = addScriptOffsetToRange({
                start: definition.textSpan.start,
                end: definition.textSpan.start + definition.textSpan.length
            }, definitionRiotDocument, sourceFile.fileName);
        } else {
            targetRange = {
                start: definition.textSpan.start,
                end: definition.textSpan.start + definition.textSpan.length
            };
        }

        if (definition.contextSpan) {
            targetSelectionRange = targetRange;
            
            if (sourceFile.fileName.endsWith(".riot")) {
                const definitionRiotDocument = (sourceFile.fileName === filePath ?
                    riotDocument : touchRiotDocument(sourceFile.fileName, null)
                );
                targetRange = addScriptOffsetToRange({
                    start: definition.contextSpan.start,
                    end: definition.contextSpan.start + definition.contextSpan.length
                }, definitionRiotDocument, sourceFile.fileName);
            } else {
                targetRange = {
                    start: definition.contextSpan.start,
                    end: definition.contextSpan.start + definition.contextSpan.length
                };
            }
        }

        return {
            path: sourceFile.fileName,
            targetRange,
            targetSelectionRange,
            originSelectionRange
        } as OffsetDefinitionResult;
    }).filter(def => def != null);
}