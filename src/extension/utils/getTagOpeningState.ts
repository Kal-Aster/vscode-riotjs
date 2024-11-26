export default function getTagOpeningState(
    offset: number, text: string,
    tagName: string, matchIndex: number,
) {
    if (offset >= text.length) {
        throw new Error("Text length should be greater than offset");
    }
    const scope: Array<
        "openingtag" |
        "openedtag" |
        "closingtag" |
        "closedtag" |
        "text" |
        "attrname" |
        "attrvalue" |
        "unquotedattrvalue" |
        "singlequotedattrvalue" |
        "doublequotedattrvalue" |
        "expression" |
        "curlybrackets" |
        "squarebrackets" |
        "parentheses"
    > = [
        "openingtag"
    ];
    const openedTags = [
        tagName
    ];
    let firstTagAttributesCount = 0;

    let tagEndingCharIndex;

    let stateAtOffset: {
        scope: (typeof scope)[0] | undefined,
        attributesCount: number,
        tagEndingCharIndex: number | undefined
    } | undefined;
    
    let charIndex = matchIndex + 1 + tagName.length;
    if (charIndex === offset) {
        stateAtOffset = {
            scope: scope.at(-1),
            attributesCount: 0,
            tagEndingCharIndex
        };
    }
    outer: for (;
        charIndex < text.length; charIndex++
    ) {
        const currentScope = scope.at(-1);
        if (currentScope == null) {
            break;
        }

        if (
            currentScope === "text" &&
            stateAtOffset != null &&
            tagEndingCharIndex === undefined
        ) {
            tagEndingCharIndex = charIndex;
        }

        const char = text[charIndex];
        switch (currentScope) {
            case "text": {
                if (char === "<") {
                    scope.splice(-1, 1, "openedtag");
                    openedTags.push("");
                    break;
                }
                if (char === "{") {
                    scope.push("expression");
                    break;
                }
                break;
            }
            case "openedtag": {
                const openedTag = openedTags.at(-1);
                if (char === "/") {
                    if (openedTag !== "") {
                        break outer;
                    }
                    openedTags.pop();
                    scope.splice(-1, 1, "closedtag");
                    break;
                }
                if (char.match(/\s/)) {
                    scope.splice(-1, 1, "openingtag");
                    break;
                }
                if (char === ">") {
                    if (openedTag === "") {
                        break outer;
                    }
                    scope.push("text");
                    break;
                }
                openedTags[openedTags.length - 1] = openedTag + char;
                break;
            }
            case "closedtag": {
                const openedTag = openedTags.at(-1)!;
                const closingTag = text.substring(
                    charIndex, charIndex + openedTag.length
                );
                if (closingTag !== openedTag) {
                    break outer;
                }

                charIndex += openedTag.length - 1;
                scope.splice(-1, 1, "closingtag");
                break;
            }
            case "closingtag": {
                if (char.match(/\s/)) {
                    break;
                }
                if (char === ">") {
                    openedTags.pop();
                    scope.splice(-1, 1);
                    const previousScope = scope.at(-1);
                    if (
                        previousScope === "openingtag" ||
                        previousScope === "openedtag"
                    ) {
                        scope.splice(-1, 1);
                    }
                    if (scope.length === 0) {
                        break outer;
                    }
                    scope.push("text");
                    break;
                }
                break outer;
            }
            case "openingtag": {
                if (char.match(/\s/)) {
                    break;
                }
                if (char === ">") {
                    scope.push("text");
                    break;
                }
                if (char === "<") {
                    break outer;
                }
                scope.push("attrname");
                break;
            }
            case "attrname": {
                if (char === "=") {
                    if (openedTags.length === 1) {
                        firstTagAttributesCount++;
                    }
                    scope.splice(-1, 1, "attrvalue");
                    break;
                }
                if (char === ">") {
                    if (openedTags.length === 1) {
                        firstTagAttributesCount++;
                    }
                    scope.splice(-1, 1);
                    charIndex--;
                    break;
                }
                if (char.match(/\s/)) {
                    if (openedTags.length === 1) {
                        firstTagAttributesCount++;
                    }
                    scope.splice(-1, 1);
                    break;
                }
                break;
            }
            case "attrvalue": {
                if (char.match(/\s/)) {
                    break;
                }
                if (char === "'") {
                    scope.splice(-1, 1, "singlequotedattrvalue");
                    break;
                }
                if (char === "\"") {
                    scope.splice(-1, 1, "doublequotedattrvalue");
                    break;
                }
                if (char === "{") {
                    scope.splice(-1, 1, "expression");
                    break;
                }
                scope.splice(-1, 1, "unquotedattrvalue");
                break;
            }
            case "unquotedattrvalue": {
                if (char.match(/\s/)) {
                    scope.splice(-1, 1);
                    break;
                }
                if (char === ">") {
                    scope.splice(-1, 1);
                    charIndex--;
                    break;
                }
                break;
            }
            case "singlequotedattrvalue": {
                if (char === "'") {
                    scope.splice(-1, 1);
                    break;
                }
                if (char === "{") {
                    scope.push("expression");
                    break;
                }
                break;
            }
            case "doublequotedattrvalue": {
                if (char === "\"") {
                    scope.splice(-1, 1);
                    break;
                }
                if (char === "{") {
                    scope.push("expression");
                    break;
                }
                break;
            }
            case "expression":
            case "curlybrackets":
            case "squarebrackets":
            case "parentheses": {
                const closing = {
                    expression: "}",
                    curlybrackets: "}",
                    squarebrackets: "]",
                    parentheses: ")"
                }[currentScope];
                if (char === closing) {
                    scope.splice(-1, 1);
                    break;
                }
                if (char === "{") {
                    scope.push("curlybrackets");
                    break;
                }
                if (char === "[") {
                    scope.push("squarebrackets");
                    break;
                }
                if (char === "(") {
                    scope.push("parentheses");
                    break;
                }
                break;
            }
        }

        if (charIndex + 1 === offset) {
            stateAtOffset = {
                scope: scope.at(-1),
                attributesCount: firstTagAttributesCount,
                tagEndingCharIndex
            };
        }
    }

    return {
        finalState: {
            scope: scope.at(-1),
            attributesCount: firstTagAttributesCount,
            tagEndingCharIndex
        },
        stateAtOffset
    };
}