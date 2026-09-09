import type { CategoryResult, ClassifyOptions, LeanletEvent, LeanletModelId, VisionLeanletOptions } from './types.js';
type Listener = (event: LeanletEvent) => void;
export declare class VisionLeanlet {
    private worker;
    private listeners;
    private pending;
    private options;
    constructor(options?: VisionLeanletOptions);
    get model(): import("./models.js").LeanletModelDefinition;
    private createWorker;
    subscribe(listener: Listener): () => boolean;
    setModel(model: LeanletModelId): void;
    warmup(): void;
    classify(file: Blob, options?: ClassifyOptions): Promise<CategoryResult>;
    destroy(): void;
}
export {};
//# sourceMappingURL=vision-leanlet.d.ts.map