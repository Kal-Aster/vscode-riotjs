import getDocument from "../../core/getDocument";

import touchRiotDocument from "../../core/riot-documents/touch";
import startDefinitionCaching from "../../core/startDefinitionCaching";

import { getState } from "../../core/state";

import uriToPath from "../../utils/document/uriToPath";

namespace onScheduleDocumentToProcess {
    export type Args = {
        uri: string
    };
}

export default async function onScheduleDocumentToProcess({
    uri
}: onScheduleDocumentToProcess.Args) {
    const {
        connection,
        riotDocuments,
        scheduledDocumentsToProcess
    } = getState();

    const document = getDocument(uri);
    if (document == null) {
        connection.console.error(`Document "${uri}" not found`);
        return null;
    }

    const riotDocument = touchRiotDocument(
        uriToPath(document.uri),
        () => document.getText()
    );
    if (riotDocument == null) {
        connection.console.error("Couldn't parse riot component");
        return null;
    }

    const { filePath } = riotDocument;

    const previousTimeout = scheduledDocumentsToProcess.get(filePath);
    if (previousTimeout != null) {
        clearTimeout(previousTimeout);
    }

    scheduledDocumentsToProcess.set(filePath, setTimeout(() => {
        scheduledDocumentsToProcess.delete(filePath);
        const riotDocument = riotDocuments.get(filePath);
        if (riotDocument == null) {
            return;
        }

        connection.console.log(`Processing document ${filePath}`);
        riotDocument.getExternalDeclaration();
        connection.console.log(`Document ${filePath} processed`);
    }, 3000));
}