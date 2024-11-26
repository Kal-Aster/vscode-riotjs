import touchRiotDocument from "../../core/riot-documents/touch";

export default function getComponentDeclaration(
    filePath: string,
    getText: () => string,
    type: "INTERNAL" | "EXTERNAL"
): string | null {
    if (type !== "INTERNAL" && type !== "EXTERNAL") {
        throw new Error(`Invalid declaration type: "${type}"`);
    }

    const riotDocument = touchRiotDocument(filePath, getText);
    if (riotDocument == null) {
        return null;
    }

    const internalDeclaration = riotDocument.getInternalDeclaration();
    if (type === "INTERNAL") {
        return internalDeclaration;
    }

    const externalDeclaration = riotDocument.getExternalDeclaration();
    return externalDeclaration;
}