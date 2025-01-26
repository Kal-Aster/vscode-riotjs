import { TextDocumentChangeEvent } from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

import removeRiotDocument from "../../core/riot-documents/remove";

import { getState } from "../../core/state";

import uriToPath from "../../utils/document/uriToPath";

export default function onDidDocumentClose(
    event: TextDocumentChangeEvent<TextDocument>
) {
    const {
        connection,
        cachingRanges
    } = getState();

    connection.console.log(
        `Document closed: "${event.document.uri}"`
    );

    const filePath = uriToPath(event.document.uri);

    for (let i = cachingRanges.length - 1; i >= 0; i--) {
        const cachingRange = cachingRanges[i];
        if (cachingRange.filePath !== filePath) {
            continue;
        }

        cachingRanges.splice(i, 1);
    }
    removeRiotDocument(filePath);
}