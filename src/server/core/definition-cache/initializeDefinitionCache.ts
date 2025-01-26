import touchRiotDocument from "../riot-documents/touch";

import { getState } from "../state";

import startDefinitionCaching from "./startDefinitionCaching";

export default function initializeDefinitionCache(filePath: string) {
    const {
        connection,
        tsLanguageService,
        cachingRanges
    } = getState();

    const riotDocument = touchRiotDocument(filePath, null);
    if (riotDocument == null) {
        connection.console.error("Riot document not available");
        return;
    }

    const { javascript } = riotDocument.getParserResult().output;

    connection.console.log(`Has javascript? ${javascript ? "Yes" : "No"}`);
    if (javascript == null) {
        riotDocument.definitionCache.clear();
        return;
    }

    const sourceFile = tsLanguageService.getSourceFile(
        riotDocument.filePath
    );
    if (sourceFile == null) {
        connection.console.log(`No source file found`);
        return;
    }

    const range = {
        start: 0,
        end: javascript.end - javascript.start
    };
    riotDocument.definitionCache.updateForChange(
        range, javascript.text?.text || "", sourceFile
    );
    let maxPriority = 0;
    cachingRanges.forEach(({ priority }) => {
        if (priority > maxPriority) {
            maxPriority = priority;
        }
    })
    cachingRanges.push({
        filePath,
        range,
        priority: maxPriority + 1
    });
    startDefinitionCaching();
}