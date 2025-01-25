import touchRiotDocument from '../../core/riot-documents/touch';

import { getState } from '../../core/state';

import DefinitionResult from '../../utils/definitions/DefinitionResult';

import convertDefinitionsOffsetToPosition from '../../utils/definitions/convertDefinitionsOffsetToPosition';
import getCachedOrActualDefinition from '../../utils/definitions/getCachedOrActualDefinition';

namespace getDefinitions {
    export type Args = {
        filePath: string,
        getText: () => string,
        offset: number
    };
}

function getDefinitions(
    {
        filePath,
        getText,
        offset
    }: getDefinitions.Args
): DefinitionResult[] {
    const {
        connection,
        tsLanguageService
    } = getState();

    connection.console.log(`Getting definition at ${offset} of ${filePath}`);

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

    return convertDefinitionsOffsetToPosition(
        riotDocument,
        tsLanguageService,
        getCachedOrActualDefinition(
            riotDocument,
            adjustedRequestedOffset,
            tsLanguageService
        ).definitions
    );
}

export default getDefinitions;