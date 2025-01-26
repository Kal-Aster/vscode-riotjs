import { getState } from "./state";

export default function insertCachingRange(
    filePath: string,
    cachingRange: {
        start: number;
        end: number;
    }
) {
    const { cachingRanges } = getState();

    let maxPriority = 0;

    for (let i = cachingRanges.length - 1; i >= 0; i--) {
        const currentCachingRange = cachingRanges[i];
        if (currentCachingRange.filePath !== filePath) {
            continue;
        }

        const { priority } = currentCachingRange;

        if (priority > maxPriority) {
            maxPriority = priority;
        }

        if (
            currentCachingRange.range.start >= cachingRange.end ||
            currentCachingRange.range.end < cachingRange.start
        ) {
            continue;
        }

        cachingRanges.splice(i, 1);

        const beforeCachingRange = {
            start: Math.min(currentCachingRange.range.start, cachingRange.start - 1),
            end: cachingRange.start - 1,
        };
        const afterCachingRange = {
            start: Math.max(currentCachingRange.range.start, cachingRange.end),
            end: currentCachingRange.range.end
        };
        if (beforeCachingRange.start < beforeCachingRange.end) {
            cachingRanges.splice(i, 0, {
                filePath,
                range: beforeCachingRange,
                priority
            });
        }
        if (afterCachingRange.start < afterCachingRange.end) {
            cachingRanges.splice(i + 1, 0, {
                filePath,
                range: afterCachingRange,
                priority
            });
        }
    }

    cachingRanges.push({
        filePath,
        range: cachingRange,
        priority: maxPriority + 1
    });
}