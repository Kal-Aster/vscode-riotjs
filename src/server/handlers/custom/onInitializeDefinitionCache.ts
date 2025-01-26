import getDocument from "../../core/getDocument";

import touchRiotDocument from "../../core/riot-documents/touch";
import startDefinitionCaching from "../../core/startDefinitionCaching";

import { getState } from "../../core/state";

import uriToPath from "../../utils/document/uriToPath";

namespace onInitializeDefinitionCache {
    export type Args = {
        uri: string
    };
}

export default async function onInitializeDefinitionCache({
    uri
}: onInitializeDefinitionCache.Args) {
    const {
        connection,
        tsLanguageService,
        cachingRanges
    } = getState();

    setImmediate(() => {
        const riotDocument = touchRiotDocument(
            uriToPath(uri), null
        );
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

        const { filePath } = riotDocument;

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
    });
}