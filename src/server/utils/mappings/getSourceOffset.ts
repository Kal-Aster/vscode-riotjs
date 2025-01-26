import { RawSourceMap, MappingItem } from "source-map";

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64ToVLQ(str: string): number[] {
    const values: number[] = [];
    let shift = 0;
    let value = 0;

    for (let i = 0; i < str.length; i++) {
        let integer = BASE64_ALPHABET.indexOf(str[i]);
        const hasContinuationBit = integer & 32;
        integer &= 31;
        value += integer << shift;

        if (hasContinuationBit) {
            shift += 5;
        } else {
            const shouldNegate = value & 1;
            value >>= 1;
            values.push(shouldNegate ? -value : value);
            value = 0;
            shift = 0;
        }
    }
    return values;
}


function decodeMappings(
    generatedLine: number,
    mapping: string,
    sourceMap: RawSourceMap,
    trackedValues: {
        sourceIndex: number;
        sourceLine: number;
        sourceColumn: number;
        nameIndex: number;
    }
): MappingItem[] {
    const segments = mapping.split(",");
    const mappings: MappingItem[] = [];
    let generatedColumn = 0;

    for (const segment of segments) {
        if (!segment) continue;

        const values = base64ToVLQ(segment);
        if (values.length < 4) continue;

        generatedColumn += values[0];
        trackedValues.sourceIndex += values[1];
        trackedValues.sourceLine += values[2];
        trackedValues.sourceColumn += values[3];

        if (trackedValues.sourceIndex >= sourceMap.sources.length) continue;

        if (values.length > 4) {
            trackedValues.nameIndex += values[4];
        }

        mappings.push({
            generatedColumn,
            generatedLine,
            originalColumn: trackedValues.sourceColumn,
            originalLine: trackedValues.sourceLine,
            source: sourceMap.sources[trackedValues.sourceIndex],
            name: (trackedValues.nameIndex < sourceMap.names.length ?
                sourceMap.names[trackedValues.nameIndex] : ""
            )
        });
    }

    return mappings;
}

export default function getSourceOffset(
    sourceMap: RawSourceMap,
    generatedCode: string,
    originalCode: string[],
    offset: number
): number {
    let remainingOffset = offset;

    let lineIndexInMap = 0;
    let columnIndexInMap = 0;

    const lines = generatedCode.split("\n");
    while (remainingOffset > 0 && lineIndexInMap < lines.length) {
        const lineLength = lines[lineIndexInMap].length + 1;
        if (remainingOffset >= lineLength) {
            remainingOffset -= lineLength;
            lineIndexInMap++;
        } else {
            columnIndexInMap = remainingOffset;
            break;
        }
    }

    let lastMapping: MappingItem | null = null;
    const lineMappings = sourceMap.mappings.split(";");
    const trackedValues = {
        sourceIndex: 0,
        sourceLine: 0,
        sourceColumn: 0,
        nameIndex: 0
    };
    for (
        let lineIndex = 0;
        lineIndex <= lineIndexInMap && lineIndex < lineMappings.length;
        lineIndex++
    ) {
        const mapping = lineMappings[lineIndex];
        if (mapping === "") {
            continue;
        }

        const decodedMappings = decodeMappings(
            lineIndex, mapping, sourceMap, trackedValues
        );
        if (decodedMappings.length <= 0) {
            continue;
        }

        if (lineIndex < lineIndexInMap) {
            lastMapping = decodedMappings.at(-1)!;
            continue;
        }

        for (const mapping of decodedMappings) {
            if (mapping.generatedColumn > columnIndexInMap) {
                break;
            }

            lastMapping = mapping;
        }
    }

    if (lastMapping == null) {
        return -1;
    }

    const sourceIndex = sourceMap.sources.indexOf(lastMapping.source);
    if (sourceIndex < 0) {
        return -1;
    }

    let lineIndexInSource = (
        lastMapping.originalLine +
        (lineIndexInMap - lastMapping.generatedLine)
    );
    const columnIndexInSource = (
        (lineIndexInMap === lastMapping.generatedLine ?
            (
                lastMapping.originalColumn +
                (
                    columnIndexInMap -
                    lastMapping.generatedColumn
                )
            ) : 0
        )
    );

    const originalSourceCode = originalCode[sourceIndex];
    if (originalSourceCode == null) {
        return -1;
    }

    const originalSourceCodeLines = originalSourceCode.split("\n");
    if (lineIndexInSource >= originalSourceCodeLines.length) {
        return -1;
    }

    let sourceOffset = 0;
    for (let lineIndex = 0; lineIndex < lineIndexInSource; lineIndex++) {
        sourceOffset += originalSourceCodeLines[lineIndex]!.length;
    }
    sourceOffset += columnIndexInSource;

    return (sourceOffset >= originalSourceCode.length ?
        -1 : sourceOffset
    );
}