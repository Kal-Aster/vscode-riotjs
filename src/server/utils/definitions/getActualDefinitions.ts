import TypeScriptLanguageService from "../../../TypeScriptLanguageService";

import RiotDocument from "../../core/riot-documents/RiotDocument";

import getTokenRangeAtOffset from "../ts/getTokenRangeAtOffset";

import mapDefinitions from "./mapDefinitions";

export default function getActualDefinitions(
    tsLanguageService: TypeScriptLanguageService,
    riotDocument: RiotDocument,
    adjustedRequestedOffset: number
) {
    const { filePath } = riotDocument;

    const sourceFile = tsLanguageService.getSourceFile(filePath);
    if (sourceFile == null) {
        return {
            tokenKey: {
                start: adjustedRequestedOffset,
                end: adjustedRequestedOffset
            },
            definitions: []
        };
    }

    const tokenKey = getTokenRangeAtOffset(sourceFile, adjustedRequestedOffset);
    if (tokenKey == null) {
        return {
            tokenKey: {
                start: adjustedRequestedOffset,
                end: adjustedRequestedOffset
            },
            definitions: []
        };
    }

    let definitions = tsLanguageService.getDefinitionAtPosition(
        filePath, adjustedRequestedOffset
    );

    if (!definitions || definitions.length === 0) {
        definitions = tsLanguageService.getTypeDefinitionAtPosition(
            filePath, adjustedRequestedOffset
        );
    }

    if (!definitions || definitions.length === 0) {
        return {
            tokenKey,
            definitions: []
        };
    }

    const javascript = riotDocument.getParserResult().output.javascript;
    const originSelectionRange = (javascript?.text != null ?
        {
            start: tokenKey.start + javascript.text.start,
            end: tokenKey.end + javascript.text.start
        } : undefined
    );

    return {
        tokenKey,
        definitions: mapDefinitions(
            definitions,
            tsLanguageService.getProgram(),
            riotDocument,
            originSelectionRange
        )
    };
}