import { CancellationToken, LSPErrorCodes, ResponseError } from "vscode-languageserver/node";

export default async function checkCancellationToken(
    token: CancellationToken
) {
    await new Promise(resolve => setImmediate(resolve));
    if (token.isCancellationRequested) {
        throw new ResponseError(
            LSPErrorCodes.RequestCancelled,
            "Request was cancelled"
        )
    }
}