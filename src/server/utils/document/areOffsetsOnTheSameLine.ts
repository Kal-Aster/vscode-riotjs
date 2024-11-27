export default function areOffsetsOnTheSameLine(
    offsetA: number, offsetB: number,
    text: string
) {
    offsetA = Math.min(offsetA, text.length);
    offsetB = Math.min(offsetB, text.length);
    if (offsetA === offsetB) {
        return true;
    }
    [offsetA, offsetB] = [
        Math.min(offsetA, offsetB),
        Math.max(offsetB, offsetA)
    ];

    return !text.substring(offsetA, offsetB).includes("\n");
}