import parser from "@riotjs/parser";

import ParserResult from "./ParserResult";

const { parse } = parser({});

export default function parseContent(
    content: string
): ParserResult {
    // @ts-expect-error
    return parse(content);
}