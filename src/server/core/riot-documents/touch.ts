import { getState } from "../state";

import updateRiotDocument from "./update";

export default function touchRiotDocument(
    filePath: string,
    getText: (() => string) | null
) {
    const riotDocument = getState().riotDocuments.get(filePath);
    if (riotDocument != null || getText == null) {
        return riotDocument || null;
    }

    return updateRiotDocument(filePath, getText());
}