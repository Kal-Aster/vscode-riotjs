function isVoidTag(tag: string) {
    return [
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "source",
        "track",
        "wbr"
    ].includes(tag);
}
export default isVoidTag;