import {
    Definition,
    DefinitionLink,
    DefinitionParams,
    Location,
    LocationLink
} from "vscode-languageserver/node";

import getDocument from "../../core/getDocument";

import touchRiotDocument from "../../core/riot-documents/touch";

import getDefinitions from "../../features/lsp/getDefinitions";

import getContentTypeAtOffset from "../../features/riot/getContentTypeAtOffset";

import uriToPath from "../../utils/document/uriToPath";
import pathToUri from "../../utils/document/pathToUri";

export default async function onDefinition(
    {
        textDocument,
        position
    }: DefinitionParams
): Promise<(
    Definition | Array<DefinitionLink> | undefined | null
)> {
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

    const definitions = getDefinitions({
        filePath,
        getText: () => document.getText(),
        offset
    }).map(({
        path, range,
        targetSelectionRange, originSelectionRange
    }) => ({
        uri: pathToUri(path),
        targetRange: range,
        targetSelectionRange,
        originSelectionRange
    }));
    if (definitions.length === 0) {
        return null;
    }

    const definitionLinks = definitions.filter(def => {
        return def.targetSelectionRange != null;
    }).map(def => {
        return LocationLink.create(
            def.uri,
            def.targetRange,
            def.targetSelectionRange!,
            def.originSelectionRange
        );
    });
    if (definitionLinks.length > 0) {
        return definitionLinks;
    }

    return Location.create(definitions[0].uri, definitions[0].targetRange);
}