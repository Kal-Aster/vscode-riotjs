import TypeScriptLanguageService from "../../../TypeScriptLanguageService";

import RiotDocument from "../../core/riot-documents/RiotDocument";

import positionAtOffset from "../document/positionAtOffset";

import convertRangeOffsetToPosition from "../ts/convertRangeOffsetToPosition";

import ReferenceResult from "./ReferenceResult";
import OffsetReferenceResult from "./OffsetReferenceResult";

export default function convertReferencesOffsetToPosition(
    riotDocument: RiotDocument,
    tsLanguageService: TypeScriptLanguageService,
    definitions: OffsetReferenceResult[]
) {
    const riotDocumentText = riotDocument.getText();

    return (definitions.map(({
        path, range
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
            )
        };
    }).filter(def => def != null)) as ReferenceResult[];
}