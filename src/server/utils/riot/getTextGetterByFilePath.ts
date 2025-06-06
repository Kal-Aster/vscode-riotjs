import { URI } from "vscode-uri";
import { existsSync, readFileSync } from "fs";

import getDocument from "../../core/getDocument";
import GlobalFileCache from "../../../GlobalFileCache";

export default function getTextGetterByFilePath(
    filePath: string
) {
    const fileURI = URI.file(filePath).toString();
        
    const document = getDocument(fileURI);
    const fileExists = existsSync(filePath);
    if (document == null && !fileExists) {
        return undefined;
    }

    return () => {
        if (document != null) {
            return document.getText()
        } else {
            return GlobalFileCache.getFileContent(filePath);
        }
    }
}