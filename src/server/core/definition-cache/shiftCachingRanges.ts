import { getState } from "../state";

export default function shiftCachingRanges(
    filePath: string,
    range: {
        start: number;
        end: number;
    },
    newText: string
) {
    const { cachingRanges } = getState();

    const delta = newText.length - (range.end - range.start);

    const adjustPosition = (cachingRange: {
        start: number;
        end: number;
    }) => {
        if (
            cachingRange.start < range.end &&
            cachingRange.end > range.end
        ) {
            cachingRange.end += delta;
        } else if (cachingRange.start >= range.end) {
            cachingRange.start += delta;
            cachingRange.end += delta;
        }
    };
    cachingRanges.forEach((cachingRange) => {
        if (cachingRange.filePath !== filePath) {
            return;
        }
        adjustPosition(cachingRange.range);
    });
}