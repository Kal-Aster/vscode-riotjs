import {
    CompletionItem,
    CompletionList,
    CompletionParams
} from "vscode-languageserver/node";

import getDocument from "../../core/getDocument";

import touchRiotDocument from "../../core/riot-documents/touch";

import { getState } from "../../core/state";

import getCssCompletions from "../../features/lsp/getCssCompletions";
import getExpressionCompletions from "../../features/lsp/getExpressionCompletions";
import getScriptCompletions from "../../features/lsp/getScriptCompletions";

import getContentTypeAtOffset from "../../features/riot/getContentTypeAtOffset";

import uriToPath from "../../utils/document/uriToPath";
import convertTsCompletions from "../../utils/completions/convertTsCompletions";

export default async function onCompletion(
    params: CompletionParams
): Promise<(
    CompletionItem[] | CompletionList |
    undefined | null
)> {
    const {
        connection,
        tsLanguageService,
        cssLanguageService,
        htmlLanguageService
    } = getState()

    const document = getDocument(params.textDocument.uri);
    if (!document) {
        return null;
    }

    const filePath = uriToPath(document.uri);
    const riotDocument = touchRiotDocument(
        filePath, () => document.getText()
    );
    if (riotDocument == null) {
        return null;
    }

    const offset = document.offsetAt(params.position);

    try {
        const contentType = getContentTypeAtOffset(
            offset, riotDocument.getParserResult()
        );
        if (contentType == null) {
            return null;
        }

        switch (contentType) {
            case "javascript": {
                const completions = getScriptCompletions({
                    filePath,
                    getText: () => document.getText(),
                    offset,
                    tsLanguageService, connection
                });

                const convertedCompletions = convertTsCompletions(
                    completions,
                    document.getText(),
                    riotDocument.getScriptPosition()!
                );

                connection.console.log(JSON.stringify(convertedCompletions.items.slice(0, 5), null, 2));

                return convertedCompletions;
            }
            case "expression": {
                const completions = getExpressionCompletions({
                    filePath,
                    getText: () => document.getText(),
                    offset,
                    tsLanguageService, connection
                });

                return convertTsCompletions(
                    completions,
                    document.getText(),
                    riotDocument.getScriptPosition()!
                );
            }
            case "css": {
                const completions = getCssCompletions({
                    filePath,
                    getText: () => document.getText(),
                    offset,
                    cssLanguageService,
                    connection
                });

                return completions;
            }
            case "template": {
                connection.console.log("Requested position is inside html");
                const htmlDocument = htmlLanguageService.parseHTMLDocument(document);
                const htmlCompletions = htmlLanguageService.doComplete(document, params.position, htmlDocument);
                return htmlCompletions;
            }
        }
    } catch (error) {
        connection.console.error(`Error in completion handler: ${error}`);
        connection.console.error(`Stack trace: ${error.stack}`);
        return {
            isIncomplete: false,
            items: []
        };
    }
}