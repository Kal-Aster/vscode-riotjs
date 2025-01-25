import TypeScriptLanguageService from "../../../TypeScriptLanguageService";

import RiotDocument from "../../core/riot-documents/RiotDocument";

import getActualDefinitions from "./getActualDefinitions";

export default function getCachedOrActualDefinition(
    riotDocument: RiotDocument,
    adjustedRequestedOffset: number,
    tsLanguageService: TypeScriptLanguageService
) {
    return riotDocument.definitionCache.getDefinition(
        adjustedRequestedOffset,
        () => getActualDefinitions(
            tsLanguageService,
            riotDocument,
            adjustedRequestedOffset
        )
    );
}