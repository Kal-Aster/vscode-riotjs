import { getState } from "../state";

import RiotDocument from "./RiotDocument";

export default function updateRiotDocument(
    filePath: string,
    content: string
) {
    const {
        connection,
        riotDocuments,
        tsLanguageService
    } = getState();

    try {
        if (riotDocuments.has(filePath)) {
            const riotDocument = riotDocuments.get(filePath)!;
            return riotDocument.update(
                content,
                tsLanguageService,
                riotDocuments
            );
        }
        const riotDocument = new RiotDocument(
            filePath, content,
            tsLanguageService,
            riotDocuments
        )
        riotDocuments.set(filePath, riotDocument);
        return riotDocument;
    } catch (error) {
        // here there will be some diagnostics
        connection.console.error(`${error}`);
        riotDocuments.delete(filePath);
        return null;
    }
}