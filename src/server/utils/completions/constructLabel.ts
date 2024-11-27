import ts from "typescript";

export default function constructLabel(
    completionEntry: ts.CompletionEntry,
    label?: string
) {
    label = label ?? completionEntry.name;

    const optionalModifier = (
        completionEntry.kindModifiers?.includes('optional') ? "?" : ""
    );

    return `${label}${optionalModifier}`;
}