type OffsetDefinitionResult = {
    path: string;
    targetRange: {
        start: number;
        end: number;
    };
    originSelectionRange?: {
        start: number;
        end: number;
    };
    targetSelectionRange?: {
        start: number;
        end: number;
    };
};
export default OffsetDefinitionResult;