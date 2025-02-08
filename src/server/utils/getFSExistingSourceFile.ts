import ts from "typescript";

import { existsSync } from "fs";

export default function getFSExistingSourceFile(
    filePath: string,
    program: ts.Program
) {
    if (!filePath.endsWith(".riot.d.ts")) {
        return program.getSourceFile(filePath);
    }

    if (existsSync(filePath)) {
        return program.getSourceFile(filePath);
    }
    const sourceRiotFilePath = filePath.replace(/\.d\.ts$/, "");

    if (!existsSync(sourceRiotFilePath)) {
        return undefined;
    }
    return program.getSourceFile(sourceRiotFilePath);
}