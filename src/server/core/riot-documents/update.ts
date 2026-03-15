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
        connection.console.error(`${error}`);
        return riotDocuments.get(filePath) ?? null;
    }
}