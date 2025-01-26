import { TextDocumentChangeEvent } from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

import updateRiotDocument from "../../core/riot-documents/update";

import { getState } from "../../core/state";

import uriToPath from "../../utils/document/uriToPath";

export default function onDidDocumentChangeContent(
    event: TextDocumentChangeEvent<TextDocument>
) {
    const {
        documents,
        connection
    } = getState();

    const { uri } = event.document;

    setTimeout(() => {
        const document = documents.get(uri);
        if (document == null) {
            connection.console.log(`Document ${uri} was just peeked: skipping update`);
            return;
        }

        updateRiotDocument(uriToPath(uri), document.getText());
    }, 100);
}