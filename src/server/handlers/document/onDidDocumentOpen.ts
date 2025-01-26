import { TextDocumentChangeEvent } from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

import GlobalFileCache from "../../../GlobalFileCache";

import initializeDefinitionCache from "../../core/definition-cache/initializeDefinitionCache";

import { getState } from "../../core/state";

import uriToPath from "../../utils/document/uriToPath";

export default function onDidDocumentOpen(
    event: TextDocumentChangeEvent<TextDocument>
) {
    const {
        documents,
        connection
    } = getState();

    const { uri } = event.document;

    const filePath = uriToPath(uri);

    connection.console.log(`Document opened: ${uri}`);
    setTimeout(() => {
        const document = documents.get(uri);
        if (document == null) {
            connection.console.log(`Document ${uri} was just peeked: skipping processing`);
            return;
        }

        GlobalFileCache.removeFile(filePath);

        initializeDefinitionCache(filePath);
    }, 100);
}