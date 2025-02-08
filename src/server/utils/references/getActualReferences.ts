import TypeScriptLanguageService from "../../../TypeScriptLanguageService";

import RiotDocument from "../../core/riot-documents/RiotDocument";

import mapReferences from "./mapReferences";

export default function getActualReferences(
    tsLanguageService: TypeScriptLanguageService,
    riotDocument: RiotDocument,
    adjustedRequestedOffset: number
) {
    const { filePath } = riotDocument;

    const sourceFile = tsLanguageService.getSourceFile(filePath);
    if (sourceFile == null) {
        return [];
    }

    let references = tsLanguageService.getReferencesAtPosition(
        filePath, adjustedRequestedOffset
    );

    if (references == null || references.length === 0) {
        return [];
    }

    return mapReferences(
        references,
        tsLanguageService.getProgram(),
        riotDocument
    );
}