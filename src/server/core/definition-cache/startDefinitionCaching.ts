import getCachedOrActualDefinition from "../../utils/definitions/getCachedOrActualDefinition";

import { getState } from "../state";

const disableAutomaticDefinitionCache = true;

let isRunning = false;
export default async function startDefinitionCaching() {
    if (disableAutomaticDefinitionCache) {
        return;
    }

    if (isRunning) {
        return;
    }
    isRunning = true;

    const {
        cachingRanges,
        connection,
        tsLanguageService,
        riotDocuments
    } = getState();

    while (cachingRanges.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 20));

        cachingRanges.sort(({ priority: a }, { priority: b }) => {
            return b - a;
        });
        if (cachingRanges.length <= 0) {
            break;
        }

        const { filePath, range } = cachingRanges[0];
        const riotDocument = riotDocuments.get(filePath);
        if (riotDocument == null) {
            cachingRanges.splice(0, 1);
            continue;
        }

        const javascript = riotDocument.getParserResult().output.javascript;

        if (javascript?.text == null) {
            cachingRanges.splice(0, 1);
            continue;
        }
        const { text } = javascript.text;

        let lastTokenEnd = null as null | number;
        outer: for (let iter = 0; iter < 2; iter++) {
            do {
                if (
                    range.start >= range.end ||
                    range.start >= text.length
                ) {
                    break outer;
                }

                const char = text[range.start];
                if (!char.match(/\s/)) {
                    break
                }

                range.start++;
                continue;
            } while (true);

            const { tokenKey } = getCachedOrActualDefinition(
                riotDocument,
                range.start,
                tsLanguageService
            );
            if (tokenKey.end === lastTokenEnd) {
                range.start = tokenKey.end + 1;
            } else {
                range.start = tokenKey.end;
            }
            lastTokenEnd = tokenKey.end;
        }

        if (
            range.start < range.end &&
            range.start < text.length
        ) {
            continue;
        }

        cachingRanges.splice(0, 1);
    }

    isRunning = false;
}