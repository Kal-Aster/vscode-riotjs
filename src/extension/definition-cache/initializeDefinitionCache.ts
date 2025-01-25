import state from "../state";

export default async function initializeDefinitionCache(
    uri: string
) {
    if (!state.riotClient) {
        return null;
    }

    return await state.riotClient.sendRequest(
        "custom/initializeDefinitionCache", {
            uri
        }
    ) as void;
}