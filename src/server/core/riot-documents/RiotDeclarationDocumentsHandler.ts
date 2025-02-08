import { existsSync } from "fs";
import { URI } from "vscode-uri";

import TypeScriptLanguageService from "../../../TypeScriptLanguageService";

import getTextGetterByFilePath from "../../utils/riot/getTextGetterByFilePath";

import getDocument from "../getDocument";

import touchRiotDocument from "./touch";
import getSourceOffset from "../../utils/mappings/getSourceOffset";

const extraExtensionRegex = /\.ts$/;

const RiotDeclarationDocumentsHandler: (
    TypeScriptLanguageService.DocumentsHandler
) = {
    extension: ".riot.ts",
    doesFileExists(tsLanguageService, filePath) {
        const baseFilePath = filePath.replace(extraExtensionRegex, "");
        
        const baseFileURI = URI.file(baseFilePath).toString();
        
        return (
            getDocument(baseFileURI) != null ||
            existsSync(baseFilePath)
        );
    },
    getDocumentContent(tsLanguageService, filePath) {
        filePath = filePath.replace(extraExtensionRegex, "");

        const getText = getTextGetterByFilePath(filePath);
        if (getText == null) {
            return undefined;
        }

        const riotDocument = touchRiotDocument(filePath, getText);
        if (riotDocument == null) {
            return undefined;
        }

        const { code } = riotDocument.getCompiled();
        return code;
    },
    getDocumentVersion(tsLanguageService, filePath) {
        const baseFilePath = filePath.replace(extraExtensionRegex, "");
        return tsLanguageService.getScriptVersion(baseFilePath);
    },
    handleDefinitionInfo(tsLanguageService, definition) {
        const filePath = definition.fileName.replace(extraExtensionRegex, "");

        const getText = getTextGetterByFilePath(filePath);
        if (getText == null) {
            return true;
        }

        const riotDocument = touchRiotDocument(filePath, getText);
        if (riotDocument == null) {
            return true;
        }

        const { code, map } = riotDocument.getCompiled();
        const startOffset = getSourceOffset(
            map, code,
            [riotDocument.getText()],
            definition.textSpan.start
        );
        // const endOffset = getSourceOffset(
        //     map, code,
        //     [riotDocument.getText()],
        //     definition.textSpan.start + definition.textSpan.length
        // );

        definition.fileName = filePath;
        definition.textSpan.start = startOffset;
        definition.textSpan.length = 0;

        return true;
    },
    handleReferenceEntry(tsLanguageService, reference) {
        const filePath = reference.fileName.replace(extraExtensionRegex, "");

        const getText = getTextGetterByFilePath(filePath);
        if (getText == null) {
            return true;
        }

        const riotDocument = touchRiotDocument(filePath, getText);
        if (riotDocument == null) {
            return true;
        }

        const { code, map } = riotDocument.getCompiled();
        const startOffset = getSourceOffset(
            map, code,
            [riotDocument.getText()],
            reference.textSpan.start
        );
        // const endOffset = getSourceOffset(
        //     map, code,
        //     [riotDocument.getText()],
        //     definition.textSpan.start + definition.textSpan.length
        // );

        reference.fileName = filePath;
        reference.textSpan.start = startOffset;
        reference.textSpan.length = reference.textSpan.length;

        return true;
    },
    handleCompletionEntry(tsLanguageService, completionEntry) {
        return false;
    }
};

export default RiotDeclarationDocumentsHandler;