export type LeanletModelId = 'mobileclip-s0' | 'mobileclip-s0-fp16' | 'mobileclip-s0-compact' | 'mobilenet-v4-medium' | 'mobilenet-v4-small';
export type Prediction = {
    label: string;
    score: number;
};
export type CategoryResult = {
    category: string;
    /** Relative model score for the supplied candidate set; not a calibrated probability. */
    score: number;
    /** @deprecated Use score. This alias remains for 0.2 compatibility. */
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
    type: 'cancelled';
    requestId: string;
    modelId: LeanletModelId;
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
    /** Cancels delivery of this request. Active backend computation may finish before the worker handles cancellation. */
    signal?: AbortSignal;
};
//# sourceMappingURL=types.d.ts.map