import { TextDocumentChangeEvent } from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

import GlobalFileCache from "../../../GlobalFileCache";

import uriToPath from "../../utils/document/uriToPath";

export default function onDidDocumentOpen(
    event: TextDocumentChangeEvent<TextDocument>
) {
    GlobalFileCache.removeFile(uriToPath(event.document.uri));
}