import { Range } from "vscode-languageserver/node";

type ReferenceResult = {
    path: string;
    range: Range;
};
export default ReferenceResult;