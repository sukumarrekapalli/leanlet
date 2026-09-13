export type LeanletExecutionProvider = 'javascript' | 'wasm-single' | 'wasm-threaded' | 'webgpu' | 'webnn';
export type LeanletAsset = {
    path: string;
    bytes: number;
    sha256?: string;
    license?: string;
    sourceRevision?: string;
};
export type LeanletManifest = {
    id: string;
    version: string;
    task: string;
    description?: string;
    assets?: readonly LeanletAsset[];
    estimatedResidentBytes?: number;
    providers: readonly LeanletExecutionProvider[];
    network?: 'deny' | 'static-assets' | 'application-managed';
};
export type LeanletTiming = {
    queuedMs: number;
    loadMs: number;
    runMs: number;
    totalMs: number;
};
export type LeanletProvenance = {
    leanletId: string;
    leanletVersion: string;
    provider: LeanletExecutionProvider;
};
export type LeanletResult<Output> = {
    status: 'accepted';
    output: Output;
    score?: number;
    calibratedConfidence?: number;
    timing?: LeanletTiming;
    provenance?: LeanletProvenance;
} | {
    status: 'abstained';
    reason: 'cancelled' | 'deadline-exceeded' | 'budget-exceeded' | 'low-score' | 'unsupported-input' | 'policy-denied';
    candidates?: unknown[];
    timing?: LeanletTiming;
    provenance?: LeanletProvenance;
} | {
    status: 'failed';
    error: LeanletError;
    recoverable: boolean;
    timing?: LeanletTiming;
    provenance?: LeanletProvenance;
};
export type LeanletErrorCode = 'DUPLICATE_ID' | 'NOT_REGISTERED' | 'DESTROYED' | 'BUDGET_EXCEEDED' | 'LOAD_FAILED' | 'RUN_FAILED' | 'DISPOSE_FAILED' | 'UNSUPPORTED_PROVIDER';
export declare class LeanletError extends Error {
    readonly code: LeanletErrorCode;
    readonly cause?: unknown;
    constructor(code: LeanletErrorCode, message: string, cause?: unknown);
}
export type LeanletRunContext = {
    readonly requestId: string;
    readonly signal: AbortSignal;
    readonly deadline: number;
    readonly provider: LeanletExecutionProvider;
    emit(detail: Record<string, unknown>): void;
};
export type KernelLeanletDefinition<Input, Output, State = undefined> = {
    manifest: LeanletManifest;
    load?: (context: LeanletRunContext) => State | Promise<State>;
    run: (input: Input, state: State, context: LeanletRunContext) => LeanletResult<Output> | Promise<LeanletResult<Output>>;
    dispose?: (state: State) => void | Promise<void>;
};
export type LeanletKernelBudget = {
    maxConcurrentRuns: number;
    maxResidentBytes: number;
    defaultDeadlineMs: number;
};
export type LeanletKernelPolicy = {
    network: 'deny' | 'static-assets' | 'application-managed';
    allowedProviders: readonly LeanletExecutionProvider[];
};
export type LeanletKernelOptions = {
    budget?: Partial<LeanletKernelBudget>;
    policy?: Partial<LeanletKernelPolicy>;
    selectProvider?: (manifest: LeanletManifest, allowed: readonly LeanletExecutionProvider[]) => LeanletExecutionProvider | undefined;
};
export type LeanletKernelEvent = {
    type: 'registered' | 'unregistered' | 'loaded' | 'disposed';
    leanletId: string;
    timestamp: number;
} | {
    type: 'queued' | 'coalesced' | 'started' | 'completed' | 'abstained' | 'failed';
    leanletId: string;
    requestId: string;
    timestamp: number;
    detail?: Record<string, unknown>;
} | {
    type: 'diagnostic';
    leanletId: string;
    requestId: string;
    timestamp: number;
    detail: Record<string, unknown>;
};
export type LeanletKernelSnapshot = {
    destroyed: boolean;
    activeRuns: number;
    queuedRuns: number;
    declaredResidentBytes: number;
    telemetry: {
        completedRuns: number;
        coalescedRuns: number;
        evictions: number;
    };
    leanlets: Array<{
        id: string;
        version: string;
        task: string;
        state: 'unloaded' | 'loading' | 'loaded';
        activeRuns: number;
        estimatedResidentBytes: number;
    }>;
};
export type KernelRunOptions = {
    signal?: AbortSignal;
    deadlineMs?: number;
    /** Higher values run first. Requests with equal priority use earliest deadline first. */
    priority?: number;
    /**
     * Shares one queued or active computation for the same Leanlet and key.
     * A coalesced caller can cancel its own wait without cancelling shared work.
     */
    coalesceKey?: string;
};
export declare function accepted<Output>(output: Output, options?: {
    score?: number;
    calibratedConfidence?: number;
}): LeanletResult<Output>;
export declare function abstained(reason: Extract<LeanletResult<never>, {
    status: 'abstained';
}>['reason'], candidates?: unknown[]): LeanletResult<never>;
export declare class LeanletKernel {
    private readonly budget;
    private readonly policy;
    private readonly selectProvider;
    private readonly slots;
    private readonly listeners;
    private readonly queue;
    private readonly coalesced;
    private readonly activeControllers;
    private readonly activeExecutions;
    private lifecycleGate;
    private activeRuns;
    private destroyed;
    private completedRuns;
    private coalescedRuns;
    private evictions;
    constructor(options?: LeanletKernelOptions);
    register<Input, Output, State>(definition: KernelLeanletDefinition<Input, Output, State>): this;
    has(id: string): boolean;
    subscribe(listener: (event: LeanletKernelEvent) => void): () => void;
    prewarm(id: string, options?: KernelRunOptions): Promise<void>;
    run<Input, Output>(leanletId: string, input: Input, options?: KernelRunOptions): Promise<LeanletResult<Output>>;
    dispose(id: string): Promise<void>;
    unregister(id: string): Promise<void>;
    inspect(): LeanletKernelSnapshot;
    destroy(): Promise<void>;
    private drain;
    private execute;
    private ensureLoaded;
    private makeRoom;
    private currentResidentBytes;
    private disposeSlot;
    private context;
    private createController;
    private resolveProvider;
    private getSlot;
    private assertActive;
    private validateManifest;
    private validateRunOptions;
    private emit;
    private withLifecycleLock;
    private waitForCaller;
}
export declare function createLeanletKernel(options?: LeanletKernelOptions): LeanletKernel;
//# sourceMappingURL=core.d.ts.map