import getDocument from "../../core/getDocument";

import { getState } from "../../core/state";

import getParsedComponent from "../../features/riot/getParsedComponent";

import uriToPath from "../../utils/document/uriToPath";

namespace onLogParsedComponent {
    export type Args = {
        uri: string
    };
}

export default async function onLogParsedComponent({
    uri
}: onLogParsedComponent.Args) {
    const {
        connection
    } = getState();

    const document = getDocument(uri);
    if (!document) {
        connection.console.error(`Document "${uri}" not found`);
        return;
    }

    const filePath = uriToPath(document.uri);
    const parsedComponent = getParsedComponent(
        filePath, () => document.getText()
    );

    if (parsedComponent == null) {
        connection.console.error("Couldn't parse riot component");
        return;
    }

    connection.console.log(
        `Compiled component of "${filePath}":\n` +
        `\`\`\`\n${JSON.stringify(parsedComponent, null, 2)}\n\`\`\`\n`
    );
}