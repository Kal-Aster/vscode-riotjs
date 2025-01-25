import state from "../state";

export default async function scheduleDocumentToProcess(
    uri: string
) {
    if (!state.riotClient) {
        return null;
    }

    return await state.riotClient.sendRequest(
        "custom/scheduleDocumentToProcess", {
            uri
        }
    ) as void;
}