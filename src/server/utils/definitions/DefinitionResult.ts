import { Range } from "vscode-languageserver/node";

type DefinitionResult = {
    path: string;
    range: Range;
    originSelectionRange?: Range;
    targetSelectionRange?: Range;
};
export default DefinitionResult;