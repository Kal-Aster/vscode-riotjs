import getDocument from "../../core/getDocument";
import insertCachingRange from "../../core/insertCachingRange";

import touchRiotDocument from "../../core/riot-documents/touch";
import shiftCachingRanges from "../../core/shiftCachingRanges";

import startDefinitionCaching from "../../core/startDefinitionCaching";

import { getState } from "../../core/state";

import uriToPath from "../../utils/document/uriToPath";

namespace onInvalidateDefinitionCacheAtRange {
    export type Args = {
        uri: string,
        range: {
            start: number,
            end: number
        },
        newText: string
    };
}

export default async function onInvalidateDefinitionCacheAtRange({
    uri, range, newText
}: onInvalidateDefinitionCacheAtRange.Args) {
    const {
        connection,
        tsLanguageService,
        cachingRanges
    } = getState();

    const document = getDocument(uri);
    if (document == null) {
        connection.console.error(`Document "${uri}" not found`);
        return null;
    }

    const riotDocument = touchRiotDocument(
        uriToPath(document.uri),
        () => document.getText()
    );
    if (riotDocument == null) {
        connection.console.error("Couldn't parse riot component");
        return null;
    }

    const { javascript } = riotDocument.getParserResult().output;

    if (javascript == null) {
        riotDocument.definitionCache.clear();
        return;
    }

    if (
        javascript.start >= range.end ||
        javascript.end < range.start
    ) {
        return;
    }

    const sourceFile = tsLanguageService.getSourceFile(
        riotDocument.filePath
    );
    if (sourceFile == null) {
        return;
    }

    const changeRange = {
        start: Math.max(0, range.start - javascript.start),
        end: Math.min(javascript.end - javascript.start, range.end - javascript.start)
    };

    shiftCachingRanges(changeRange, newText, riotDocument);

    const invalidatedScope = riotDocument.definitionCache.updateForChange(
        changeRange, newText, sourceFile
    );
    if (invalidatedScope == null) {
        return;
    }

    insertCachingRange(
        riotDocument,
        {
            start: invalidatedScope.start,
            end: invalidatedScope.end
        }
    );
    startDefinitionCaching();
}