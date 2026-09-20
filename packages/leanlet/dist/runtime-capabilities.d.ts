export type LeanletWebGpuUnavailableReason = 'api-unavailable' | 'adapter-unavailable' | 'probe-failed';
export type LeanletRuntimeCapabilities = {
    /** Versioned so persisted diagnostics can be interpreted safely. */
    readonly schemaVersion: 1;
    readonly webAssembly: boolean;
    readonly workers: boolean;
    readonly sharedArrayBuffer: boolean;
    readonly crossOriginIsolated: boolean;
    readonly webgpu: {
        readonly available: true;
        /** Standardized feature names only; adapter identity is intentionally omitted. */
        readonly features: readonly string[];
    } | {
        readonly available: false;
        readonly features: readonly [];
        readonly reason: LeanletWebGpuUnavailableReason;
    };
};
type WebGpuAdapterLike = {
    readonly features?: Iterable<string>;
};
type NavigatorLike = {
    readonly gpu?: {
        requestAdapter(): Promise<WebGpuAdapterLike | null>;
    };
};
export type RuntimeCapabilityProbeOptions = {
    /** Test and non-window environments can provide their own browser surface. */
    navigator?: NavigatorLike;
    /** Override globals when probing a worker, test fixture, or embedded browser. */
    webAssembly?: boolean;
    workers?: boolean;
    sharedArrayBuffer?: boolean;
    crossOriginIsolated?: boolean;
};
/**
 * Inspect the browser primitives Leanlet routes may require.
 *
 * The profile intentionally excludes adapter names, vendors, memory, and other
 * high-entropy properties. Probing never downloads assets or initializes a
 * model runtime.
 */
export declare function probeRuntimeCapabilities(options?: RuntimeCapabilityProbeOptions): Promise<LeanletRuntimeCapabilities>;
export {};
//# sourceMappingURL=runtime-capabilities.d.ts.map