import { TextDocumentChangeEvent } from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

import removeRiotDocument from "../../core/riot-documents/remove";

import { getState } from "../../core/state";

import uriToPath from "../../utils/document/uriToPath";

export default function onDidDocumentClose(
    event: TextDocumentChangeEvent<TextDocument>
) {
    getState().connection.console.log(
        `Document closed: "${event.document.uri}"`
    );
    removeRiotDocument(uriToPath(event.document.uri));
}