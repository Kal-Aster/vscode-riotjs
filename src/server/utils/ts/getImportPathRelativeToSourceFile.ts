import path from "path";

export default function getImportPathRelativeToSource(
    importAbsoluteFilePath: string,
    sourceFilePath: string,
    trimTsExtension = true
): string | undefined {
    // Handle node module imports
    const nodeModulesIndex = importAbsoluteFilePath.indexOf("node_modules/");
    if (nodeModulesIndex >= 0) {
        const modulePath = importAbsoluteFilePath.slice(nodeModulesIndex + "node_modules/".length);
        const splitModulePath = modulePath.split("/");
        return splitModulePath.slice(0, Math.max(splitModulePath.length - 1, 1)).join("/");
    }

    // Handle relative imports
    const relativePath = path.relative(path.dirname(sourceFilePath), importAbsoluteFilePath);
    if (relativePath.startsWith(".")) {
        return (trimTsExtension ?
            relativePath.replace(/(?:\.d)?\.ts$/, "") :
            relativePath
        );
    }
    if (!relativePath.includes("/")) {
        return (trimTsExtension ?
            `./${relativePath}`.replace(/(?:\.d)?\.ts$/, "") : 
            `./${relativePath}`
        );
    }

    return undefined;
}