import getDocument from "../../core/getDocument";

import insertCachingRange from "../../core/definition-cache/insertCachingRange";
import shiftCachingRanges from "../../core/definition-cache/shiftCachingRanges";
import startDefinitionCaching from "../../core/definition-cache/startDefinitionCaching";

import touchRiotDocument from "../../core/riot-documents/touch";

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
        tsLanguageService
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

    shiftCachingRanges(riotDocument.filePath, changeRange, newText);

    const invalidatedScope = riotDocument.definitionCache.updateForChange(
        changeRange, newText, sourceFile
    );
    if (invalidatedScope == null) {
        return;
    }

    insertCachingRange(
        riotDocument.filePath,
        {
            start: invalidatedScope.start,
            end: invalidatedScope.end
        }
    );
    startDefinitionCaching();
}