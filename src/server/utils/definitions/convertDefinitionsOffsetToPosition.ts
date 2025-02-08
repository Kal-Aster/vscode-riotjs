import TypeScriptLanguageService from "../../../TypeScriptLanguageService";

import RiotDocument from "../../core/riot-documents/RiotDocument";

import positionAtOffset from "../document/positionAtOffset";

import convertRangeOffsetToPosition from "../ts/convertRangeOffsetToPosition";

import DefinitionResult from "./DefinitionResult";
import OffsetDefinitionResult from "./OffsetDefinitionResult";

export default function convertDefinitionsOffsetToPosition(
    riotDocument: RiotDocument,
    tsLanguageService: TypeScriptLanguageService,
    definitions: OffsetDefinitionResult[]
) {
    const riotDocumentText = riotDocument.getText();

    return (definitions.map(({
        path,
        targetRange: range,
        targetSelectionRange,
        originSelectionRange
    }) => {
        const sourceFile = tsLanguageService.getSourceFile(path);
        if (sourceFile == null) {
            return null;
        }

        return {
            path,
            range: (path === riotDocument.filePath ?
                {
                    start: positionAtOffset(riotDocumentText, range.start),
                    end: positionAtOffset(riotDocumentText, range.end)
                } :
                convertRangeOffsetToPosition(range, sourceFile)
            ),
            targetSelectionRange: (targetSelectionRange != null ?
                (path === riotDocument.filePath ?
                    {
                        start: positionAtOffset(riotDocumentText, targetSelectionRange.start),
                        end: positionAtOffset(riotDocumentText, targetSelectionRange.end)
                    } :
                    convertRangeOffsetToPosition(targetSelectionRange, sourceFile)
                ) :
                undefined
            ),
            originSelectionRange: (originSelectionRange != null ?
                {
                    start: positionAtOffset(riotDocumentText, originSelectionRange.start),
                    end: positionAtOffset(riotDocumentText, originSelectionRange.end)
                } :
                undefined
            )
        };
    }).filter(def => def != null)) as DefinitionResult[];
}