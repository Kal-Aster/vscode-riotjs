import ts from "typescript";
import getCachedOrActualDefinition from "../utils/definitions/getCachedOrActualDefinition";

import { getState } from "./state";

let isRunning = false;
export default async function startDefinitionCaching() {
    if (isRunning) {
        return;
    }
    isRunning = true;

    const {
        cachingRanges,
        connection,
        tsLanguageService
    } = getState();

    while (cachingRanges.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 20));

        connection.console.log("Caching definitions");

        cachingRanges.sort(({ priority: a }, { priority: b }) => {
            return b - a;
        });
        if (cachingRanges.length <= 0) {
            break;
        }

        const { document, range } = cachingRanges[0];
        const javascript = document.getParserResult().output.javascript;

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

            connection.console.log(`Getting definition at ${range.start}`);
            const { tokenKey } = getCachedOrActualDefinition(
                document,
                range.start,
                tsLanguageService
            );
            if (tokenKey.end === lastTokenEnd) {
                range.start = tokenKey.end + 1;
            } else {
                range.start = tokenKey.end;
            }
            lastTokenEnd = tokenKey.end;
            connection.console.log(`Moving cursor at ${range.start}`);
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