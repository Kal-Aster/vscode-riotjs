import ts from 'typescript';

import { existsSync } from 'fs';
import { Range } from 'vscode-languageserver/node';

import touchRiotDocument from '../../core/riot-documents/touch';

import { getState } from '../../core/state';

namespace getDefinitions {
    export type DefinitionResult = {
        path: string;
        range: Range;
        originSelectionRange?: Range;
        targetSelectionRange?: Range;
    }

    export type Args = {
        filePath: string,
        getText: () => string,
        offset: number
    };
}


function getFSExistingSourceFile(
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

export default function getDefinitions(
    {
        filePath,
        getText,
        offset
    }: getDefinitions.Args
): getDefinitions.DefinitionResult[] {
    const {
        connection,
        tsLanguageService
    } = getState();

    if (tsLanguageService == null) {
        connection.console.error("No Language Service");
        return [];
    }
    const riotDocument = touchRiotDocument(filePath, getText);
    if (riotDocument == null) {
        connection.console.error("No script content found");
        return [];
    }
    
    const parserResult = riotDocument.getParserResult();
    const scriptPosition = riotDocument.getScriptPosition();
    if (
        scriptPosition == null ||
        parserResult.output.javascript == null ||
        parserResult.output.javascript.text == null
    ) {
        connection.console.error("No script content found");
        return [];
    }

    const scriptOffset = parserResult.output.javascript.text.start;
    const adjustedRequestedOffset = (
        offset - scriptOffset
    );

    let definitions = tsLanguageService.getDefinitionAtPosition(
        filePath, adjustedRequestedOffset
    );

    if (!definitions || definitions.length === 0) {
        definitions = tsLanguageService.getTypeDefinitionAtPosition(
            filePath, adjustedRequestedOffset
        );
    }

    if (!definitions || definitions.length === 0) {
        connection.console.error("Definition not found");
        return [];
    }

    const program = tsLanguageService.getProgram();

    return definitions.map(definition => {
        const sourceFile = getFSExistingSourceFile(
            definition.fileName, program
        );
        if (sourceFile == null) {
            if (!definition.fileName.endsWith(".riot.d.ts")) {
                return null;
            }

            const riotDocument = touchRiotDocument(
                definition.fileName.replace(/.riot.d.ts$/, ".riot"), null
            );
            if (riotDocument == null) {
                return null;
            }

            const range = Range.create({ line: 0, character: 0 }, { line: 0, character: 0 });

            return {
                path: riotDocument.filePath,
                range, targetSelectionRange: range
            } as getDefinitions.DefinitionResult;
        }

        const rangeStart = sourceFile.getLineAndCharacterOfPosition(
            definition.textSpan.start
        );
        const rangeEnd = sourceFile.getLineAndCharacterOfPosition(
            definition.textSpan.start + definition.textSpan.length
        );

        let range: Range;
        if (sourceFile.fileName.endsWith(".riot")) {
            const definitionRiotDocument = (sourceFile.fileName === filePath ?
                riotDocument : touchRiotDocument(sourceFile.fileName, null)
            );
            const scriptPosition = definitionRiotDocument?.getScriptPosition();
            if (definitionRiotDocument != null && scriptPosition != null) {
                connection.console.log(JSON.stringify({
                    scriptPosition,
                    rangeStart
                }, null, 2));
                if (sourceFile.fileName === filePath) {
                    range = Range.create(
                        {
                            line: rangeStart.line + scriptPosition.line,
                            character: (
                                rangeStart.character + (rangeStart.line === 0 ?
                                    scriptPosition.character : 0
                                )
                            )
                        },
                        {
                            line: rangeEnd.line + scriptPosition.line,
                            character: (
                                rangeEnd.character + (rangeEnd.line === 0 ?
                                    scriptPosition.character : 0
                                )
                            )
                        }
                    );
                } else {
                    // here should use source map of declaration to map to actual position
                    range = Range.create({ line: 0, character: 0 }, { line: 0, character: 0 });
                }
            } else {
                range = Range.create(
                    rangeStart, rangeEnd
                );
            }
        } else {
            range = Range.create(
                rangeStart, rangeEnd
            );
        }

        return {
            path: sourceFile.fileName,
            range,
            targetSelectionRange: range
        } as getDefinitions.DefinitionResult;
    }).filter((def): def is getDefinitions.DefinitionResult => {
        return def !== null
    });
}