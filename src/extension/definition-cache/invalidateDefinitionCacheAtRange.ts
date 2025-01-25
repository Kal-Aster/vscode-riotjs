import state from "../state";

export default async function invalidateDefinitionCacheAtRange(
    uri: string,
    range: {
        start: number,
        end: number
    },
    newText: string
) {
    if (!state.riotClient) {
        return null;
    }

    return await state.riotClient.sendRequest(
        "custom/invalidateDefinitionCacheAtRange", {
            uri, range, newText
        }
    ) as void;
}