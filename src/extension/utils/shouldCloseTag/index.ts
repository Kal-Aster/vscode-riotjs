import isVoidTag from "./isVoidTag";
import OpenedTag from "./OpenedTag";

export default function shouldCloseTag(
    offset: number,
    text: string,
    log?: (message: string) => void
): {
    shouldClose: false
} | {
    shouldClose: true,
    tagName: string,
    voidTag: boolean,
    hasOpeningTagClosingChar: boolean,
    suggestedIndex: number
} {
    if (offset > text.length) {
        throw new Error(`Offset cannot be greater than text length: ${offset} > ${text.length}`);
    }
    const scope: Array<
        "openingtag" |
        "openedtag" |
        "selfclosingtag" |
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
        "parentheses" |
        "invalidclosingtagname" |
        "invalidtagname" |
        "invalidselfclosing"
    > = [
        "text"
    ];
    const openedTags: Array<OpenedTag> = [];
    let firstTagAttributesCount = 0;

    let tagEndingCharIndex;

    let stateAtOffset: {
        scope: (typeof scope)[0] | undefined,
        attributesCount: number,
        tagEndingCharIndex: number | undefined
    } | undefined;
    
    let charIndex = 0;
    if (charIndex === offset) {
        stateAtOffset = {
            scope: scope.at(-1),
            attributesCount: 0,
            tagEndingCharIndex
        };
    }

    let tagToCheck: OpenedTag | null = null;
    let lastScope: (typeof scope[0]) | null = null;
    outer: for (;
        charIndex < text.length; charIndex++
    ) {
        const currentScope = scope.at(-1);
        const hasChangedScope = lastScope !== currentScope;
        if (hasChangedScope) {
            lastScope = currentScope || null;
        }
        if (
            currentScope == null ||
            currentScope.startsWith("invalid")
        ) {
            break;
        }

        if (charIndex === offset) {
            tagToCheck = openedTags.at(-1) || null;
        }

        const char = text[charIndex];
        switch (currentScope) {
            case "text": {
                if (char === "<") {
                    scope.splice(-1, 1, "openedtag");
                    openedTags.push({
                        name: "",
                        openingIndex: charIndex,
                        openingTagClosingCharIndex: -1,
                        closingIndex: -1,
                        attributeListEndIndex: -1
                    });
                    break;
                }
                if (char === "{") {
                    scope.push("expression");
                    break;
                }
                break;
            }
            case "openedtag": {
                const openedTag = openedTags.at(-1)!;
                if (char === "/") {
                    if (openedTag.name !== "") {
                        openedTag.closingIndex = charIndex;
                        scope.splice(-1, 1, "selfclosingtag");
                        break;
                    }
                    openedTags.pop();
                    scope.splice(-1, 1, "closedtag");
                    break;
                }
                if (char.match(/\s/)) {
                    if (openedTag.name !== "") {
                        const previousTag = openedTags.at(-2);
                        if (previousTag != null && isVoidTag(previousTag.name)) {
                            openedTags.splice(-2, 1);
                        }
                        scope.splice(-1, 1, "openingtag");
                    }
                    break;
                }
                if (char === ">") {
                    if (openedTag.name === "") {
                        scope.splice(-1, 1, "invalidtagname");
                        break;
                    }
                    openedTag.openingTagClosingCharIndex = charIndex;
                    if (isVoidTag(openedTag.name)) {
                        openedTags.splice(-1, 1);
                        scope.splice(-1, 1, "text");
                    } else {
                        scope.push("text");
                    }
                    break;
                }
                openedTag.name = openedTag.name + char;
                break;
            }
            case "closedtag": {
                let openedTag = openedTags.at(-1)!;
                if (char.match(/\s/)) {
                    break;
                }
                const closingTag = text.substring(
                    charIndex, charIndex + openedTag.name.length
                );
                if (closingTag !== openedTag.name) {
                    scope.splice(-1, 1, "invalidclosingtagname");
                    break;
                }

                charIndex += openedTag.name.length - 1;
                openedTag.closingIndex = text.lastIndexOf("<", charIndex);
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
            case "selfclosingtag": {
                if (char.match(/\s/)) {
                    break;
                }
                if (char === ">") {
                    openedTags.pop()!.openingTagClosingCharIndex = charIndex;
                    scope.splice(-1, 1, "text");
                    break;
                }
                scope.splice(-1, 1, "invalidselfclosing");
                break;
            }
            case "openingtag": {
                const openedTag = openedTags.at(-1)!;
                if (hasChangedScope) {
                    openedTag.attributeListEndIndex = charIndex;
                }
                if (char.match(/\s/)) {
                    break;
                }
                if (char === "/") {
                    scope.splice(-1, 1, "selfclosingtag");
                    break;
                }
                if (char === ">") {
                    openedTag.openingTagClosingCharIndex = charIndex;
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

    log?.(JSON.stringify({
        tagToCheck,
        openedTags: openedTags.map(t => {
            return {
                ...t,
                void: isVoidTag(t.name),
                snippet: text.substring(t.openingIndex, t.openingIndex + 30)
            }
        })
    }, null, 2));

    if (tagToCheck == null) {
        return { shouldClose: false };
    }

    const isVoid = isVoidTag(tagToCheck.name);

    const hasOpeningTagClosingChar = tagToCheck.openingTagClosingCharIndex > -1;

    if (isVoid && hasOpeningTagClosingChar) {
        return { shouldClose: false };
    }

    if (tagToCheck.closingIndex > -1) {
        return { shouldClose: false };
    }

    return {
        shouldClose: true,
        tagName: tagToCheck.name,
        voidTag: isVoid,
        hasOpeningTagClosingChar,
        suggestedIndex: hasOpeningTagClosingChar ? tagToCheck.openingTagClosingCharIndex + 1 : tagToCheck.attributeListEndIndex
    };
}