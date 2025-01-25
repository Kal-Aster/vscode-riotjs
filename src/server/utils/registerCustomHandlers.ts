import { createConnection } from "vscode-languageserver/node";

export default function registerCustomHandlers(
    connection: ReturnType<typeof createConnection>,
    customHandlers: Array<(...args: any[]) => any>
) {
    customHandlers.forEach(customHandler => {
        const route = customHandler.name.replace(
            /^on(\w)/, (_, char) => char.toLowerCase()
        );
        connection.onRequest(
            `custom/${route}`, customHandler
        );
    })
}