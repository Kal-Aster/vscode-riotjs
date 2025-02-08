import { Location, LocationLink, ReferenceParams } from "vscode-languageclient/node";
import getDocument from "../../core/getDocument";
import uriToPath from "../../utils/document/uriToPath";
import touchRiotDocument from "../../core/riot-documents/touch";
import getContentTypeAtOffset from "../../features/riot/getContentTypeAtOffset";
import getReferences from "../../features/lsp/getReferences";
import pathToUri from "../../utils/document/pathToUri";

export default function onReferences(
    {
        textDocument,
        position
    }: ReferenceParams
): Array<Location> | null {
    const document = getDocument(textDocument.uri);
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

    const offset = document.offsetAt(position);

    const contentType = getContentTypeAtOffset(
        offset, riotDocument.getParserResult()
    )
    if (contentType !== "javascript") {
        return null;
    }

    return getReferences({
        filePath,
        getText: () => document.getText(),
        offset
    }).map(({ path, range }) => ({
        uri: pathToUri(path),
        range
    }));
}