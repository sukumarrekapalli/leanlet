export type LeanletModelId = 'mobileclip-s0' | 'mobileclip-s0-fp16' | 'mobileclip-s0-compact' | 'mobilenet-v4-medium' | 'mobilenet-v4-small';
export type Prediction = {
    label: string;
    score: number;
};
export type CategoryResult = {
    category: string;
    confidence: number;
    predictions: Prediction[];
    elapsedMs: number;
    modelId: LeanletModelId;
};
export type LeanletStatus = 'idle' | 'loading' | 'ready' | 'running' | 'error';
export type LeanletEvent = {
    type: 'status';
    state: Exclude<LeanletStatus, 'idle' | 'error'>;
    message: string;
    progress?: number;
    modelId: LeanletModelId;
} | {
    type: 'result';
    result: CategoryResult;
    requestId: string;
} | {
    type: 'error';
    message: string;
    requestId?: string;
    modelId: LeanletModelId;
};
export type VisionLeanletOptions = {
    model?: LeanletModelId;
    categories?: readonly string[];
    assetBase?: string;
    threads?: number;
    workerUrl?: URL;
    /** Writes lifecycle events and worker diagnostics to browser DevTools. Defaults to false. */
    debug?: boolean;
};
export type ClassifyOptions = {
    categories?: readonly string[];
};
//# sourceMappingURL=types.d.ts.map