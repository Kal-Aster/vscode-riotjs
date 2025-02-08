import touchRiotDocument from '../../core/riot-documents/touch';

import { getState } from '../../core/state';

import convertReferencesOffsetToPosition from '../../utils/references/convertReferencesOffsetToPosition';

import getActualReferences from '../../utils/references/getActualReferences';
import ReferenceResult from '../../utils/references/ReferenceResult';

namespace getReferences {
    export type Args = {
        filePath: string,
        getText: () => string,
        offset: number
    };
}

function getReferences(
    {
        filePath,
        getText,
        offset
    }: getReferences.Args
): ReferenceResult[] {
    const {
        connection,
        tsLanguageService
    } = getState();

    connection.console.log(`Getting references at ${offset} of ${filePath}`);

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

    return convertReferencesOffsetToPosition(
        riotDocument,
        tsLanguageService,
        getActualReferences(
            tsLanguageService,
            riotDocument,
            adjustedRequestedOffset
        )
    );
}

export default getReferences;