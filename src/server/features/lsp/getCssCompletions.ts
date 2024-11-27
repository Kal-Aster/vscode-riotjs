import { LanguageService } from "vscode-css-languageservice"
import { createConnection } from "vscode-languageserver/node"
import touchRiotDocument from "../../core/riot-documents/touch";
import positionAtOffset from "../../utils/document/positionAtOffset";
import positionSubtract from "../../utils/document/positionSubtract";
import positionAdd from "../../utils/document/positionAdd";
import { Range } from "vscode-languageserver-textdocument";

namespace getCssCompletions {
    export type Args = {
        filePath: string,
        getText: () => string,
        offset: number,
        cssLanguageService: LanguageService,
        connection: ReturnType<typeof createConnection>
    };
}

export default function getCssCompletions(
    {
        filePath,
        getText,
        offset,
        cssLanguageService,
        connection
    }: getCssCompletions.Args
) {
    if (cssLanguageService == null) {
        connection.console.log("No Language Service");
        return null;
    }
    const riotDocument = touchRiotDocument(filePath, getText);
    if (riotDocument == null) {
        connection.console.error("Couldn't parse the file");
        return null;
    }
    
    const cssDocument = riotDocument.getCssEmbeddedDocument();
    if (cssDocument == null) {
        connection.console.error("No css content found");
        return null;
    }

    const cssPosition = riotDocument.getCssPosition()!;
    const position = positionSubtract(
        positionAtOffset(
            riotDocument.getText(), offset
        ),
        cssPosition
    );
    const cssCompletions = cssLanguageService.doComplete(
        cssDocument, position,
        riotDocument.getStylesheet(cssLanguageService)!
    );

    const editedRanges: Array<Range> = [];

    cssCompletions.items.forEach(item => {
        if (item.textEdit) {
            if ("range" in item.textEdit) {
                const { range } = item.textEdit
                if (!editedRanges.includes(range)) {
                    range.start = positionAdd(
                        cssPosition, range.start
                    );
                    range.end = positionAdd(
                        cssPosition, range.end
                    );
                    editedRanges.push(range);
                }
            } else if ("insert" in item.textEdit) {
                const { insert, replace } = item.textEdit;
                if (!editedRanges.includes(insert)) {
                    insert.start = positionAdd(
                        cssPosition, insert.start
                    );
                    insert.end = positionAdd(
                        cssPosition, insert.end
                    );
                    editedRanges.push(insert);
                }
                if (!editedRanges.includes(replace)) {
                    replace.start = positionAdd(
                        cssPosition, replace.start
                    );
                    replace.end = positionAdd(
                        cssPosition, replace.end
                    );
                    editedRanges.push(replace);
                }
            }
        }
        item.additionalTextEdits?.forEach(textEdit => {
            const { range } = textEdit
            if (!editedRanges.includes(range)) {
                range.start = positionAdd(
                    cssPosition, range.start
                );
                range.end = positionAdd(
                    cssPosition, range.end
                );
                editedRanges.push(range);
            }
        });
    });
    const editRange = cssCompletions.itemDefaults?.editRange;
    if (editRange) { 
        if ("insert" in editRange) {
            const { insert, replace } = editRange;
            if (!editedRanges.includes(insert)) {
                insert.start = positionAdd(
                    cssPosition, insert.start
                );
                insert.end = positionAdd(
                    cssPosition, insert.end
                );
                editedRanges.push(insert);
            }
            if (!editedRanges.includes(replace)) {
                replace.start = positionAdd(
                    cssPosition, replace.start
                );
                replace.end = positionAdd(
                    cssPosition, replace.end
                );
                editedRanges.push(replace);
            } 
        } else {
            if (!editedRanges.includes(editRange)) {
                editRange.start = positionAdd(
                    cssPosition, editRange.start
                );
                editRange.end = positionAdd(
                    cssPosition, editRange.end
                );
                editedRanges.push(editRange);
            }
        }
    }

    return cssCompletions;
}