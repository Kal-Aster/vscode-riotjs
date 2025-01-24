import { getState } from "./state";

export default function scheduleDocumentToProcess(
    filePath: string
) {
    const {
        connection,
        riotDocuments,
        scheduledDocumentsToProcess
    } = getState();

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

        connection.console.log(`Processing document ${riotDocument.filePath}`);
        riotDocument.getExternalDeclaration();
    }, 3000));
}