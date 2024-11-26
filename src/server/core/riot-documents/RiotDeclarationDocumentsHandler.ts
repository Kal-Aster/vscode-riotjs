import { existsSync } from "fs";
import { URI } from "vscode-uri";

import TypeScriptLanguageService from "../../../TypeScriptLanguageService";

import getComponentDeclaration from "../../features/riot/getComponentDeclaration";

import getTextGetterByFilePath from "../../utils/riot/getTextGetterByFilePath";

import getDocument from "../getDocument";

const RiotDeclarationDocumentsHandler: (
    TypeScriptLanguageService.DocumentsHandler
) = {
    extension: ".riot.d.ts",
    doesFileExists(filePath) {
        const baseFilePath = filePath.replace(/.d.ts$/, "");
        
        const baseFileURI = URI.file(baseFilePath).toString();
        
        return (
            getDocument(baseFileURI) != null ||
            existsSync(baseFilePath)
        );
    },
    getDocumentContent(filePath) {
        const baseFilePath = filePath.replace(/.d.ts$/, "");
        
        const getText = getTextGetterByFilePath(baseFilePath);
        if (getText == null) {
            return undefined;
        }

        const declaration = getComponentDeclaration(
            baseFilePath, getText, "EXTERNAL"
        );
        return declaration ?? undefined;
    },
    getDocumentVersion(filePath) {
        const baseFilePath = filePath.replace(/.d.ts$/, "");
        const version = this.getScriptVersion(baseFilePath);
        return version;
    },
};

export default RiotDeclarationDocumentsHandler;