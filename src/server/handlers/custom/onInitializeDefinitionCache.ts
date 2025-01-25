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

    const document = getDocument(uri);
    if (document == null) {
        connection.console.error(`Document "${uri}" not found`);
        return;
    }

    const riotDocument = touchRiotDocument(
        uriToPath(document.uri),
        () => document.getText()
    );
    if (riotDocument == null) {
        connection.console.error("Couldn't parse riot component");
        return;
    }

    setImmediate(() => {
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
        cachingRanges.push({
            filePath,
            range,
            priority: 0
        });
        startDefinitionCaching();
    });
}