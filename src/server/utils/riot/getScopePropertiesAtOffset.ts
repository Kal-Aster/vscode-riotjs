import TypeScriptLanguageService from "../../../TypeScriptLanguageService";

import RiotDocument from "../../core/riot-documents/RiotDocument";

import extractSlotNodes from "../node/extractSlotNodes";
import getScopeComponentsNamesAtOffset from "../node/getScopeComponentsNamesAtOffset";
import isPropertyAccessibleViaDotSyntax from "../ts/isPropertyAccessibleViaDotSyntax";

import getEmbeddedComponentSourceFilePath from "./getEmbeddedComponentSourceFilePath";
import getRiotDocumentByFilePath from "./getRiotDocumentByFilePath";

export default function getScopePropertiesAtOffset(
    riotDocument: RiotDocument,
    offset: number,
    tsLanguageService: TypeScriptLanguageService
) {
    const properties = riotDocument.getComponentProperties(
        tsLanguageService
    ) || {};

    const componentsProperty = riotDocument.getComponentsProperty(
        tsLanguageService
    );

    if (componentsProperty != null) {
        const scopeComponentsNames = getScopeComponentsNamesAtOffset(
            offset, riotDocument.getParserResult().output.template
        );
        scopeComponentsNames.map(scopeComponentName => {
            const sourceFilePath = getEmbeddedComponentSourceFilePath(
                componentsProperty,
                tsLanguageService.getProgram().getTypeChecker(),
                scopeComponentName
            )?.replace(/\.d\.ts$/, "");
            if (sourceFilePath == null) {
                return null;
            }

            const riotDocument = getRiotDocumentByFilePath(sourceFilePath);
            if (riotDocument == null) {
                return null;
            }

            const { template } = riotDocument.getParserResult().output;
            const slotNodes = extractSlotNodes(template);
            const slotNode = slotNodes.find(({ name }) => name === "default");
            if (slotNode == null) {
                return;
            }
            
            Object.entries(slotNode.props).forEach((
                [prop, value]
            ) => {
                const propertyName = isPropertyAccessibleViaDotSyntax(prop) ? prop : `"${prop}"`;
                // should infer type of prop
                properties[prop] = `${propertyName}: any`;
            });
        })
    }

    return properties;
}