import ts from "typescript";

import constructLabel from "./constructLabel";

export default function getCompletionEntryLabelAndLabelDetails(
    completionEntry: ts.CompletionEntry
): {
    label: string,
    labelDetails: ts.CompletionEntryLabelDetails | undefined
} {
    if (completionEntry.labelDetails != null) {
        return {
            label: constructLabel(completionEntry),
            labelDetails: completionEntry.labelDetails
        }
    }
    const extractedName = completionEntry.sortText.match(/\u0000(.*)\u0000/);
    if (extractedName == null) {
        const label = constructLabel(completionEntry);
        return {
            label, labelDetails: undefined
        };
    }
    const extractedLabel = extractedName[1];
    const detailRegex = new RegExp(`^${extractedLabel}(.*)$`);
    const extractedDetail = completionEntry.name.match(detailRegex);
    if (extractedDetail == null) {
        const label = constructLabel(completionEntry);
        return {
            label, labelDetails: undefined
        };
    }

    const label = constructLabel(completionEntry, extractedLabel);
    return {
        label,
        labelDetails: {
            detail: extractedDetail[1],
            description: undefined
        }
    };
}
