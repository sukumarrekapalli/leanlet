import type { KernelRunOptions, LeanletKernel, LeanletResult } from './core.js';
import { type LeanletRuntimeCapabilities, type RuntimeCapabilityProbeOptions } from './runtime-capabilities.js';
export type LeanletRuntimeRequirements = {
    webAssembly?: boolean;
    workers?: boolean;
    sharedArrayBuffer?: boolean;
    crossOriginIsolated?: boolean;
    webgpu?: boolean;
    webgpuFeatures?: readonly string[];
};
export type CapabilityRouteFallbackStatus = 'abstained' | 'failed';
export type CapabilityRouteCandidate = {
    leanletId: string;
    requires?: LeanletRuntimeRequirements;
    /**
     * Result statuses that may continue to the next compatible candidate.
     * Omit this field to stop after this candidate. Fallback is never implicit.
     */
    continueOn?: readonly CapabilityRouteFallbackStatus[];
};
export type CapabilityRouteDefinition = {
    id: string;
    candidates: readonly CapabilityRouteCandidate[];
};
export type CapabilityRouteAttempt = {
    leanletId: string;
    status: 'incompatible';
    missing: readonly string[];
} | {
    leanletId: string;
    status: LeanletResult<unknown>['status'];
    result: LeanletResult<unknown>;
};
export type CapabilityRouteRunOptions = KernelRunOptions & {
    capabilities?: LeanletRuntimeCapabilities;
    probe?: RuntimeCapabilityProbeOptions;
};
export type CapabilityRouteResult<Output> = {
    routeId: string;
    result: LeanletResult<Output>;
    selectedLeanletId?: string;
    fallbackUsed: boolean;
    capabilities: LeanletRuntimeCapabilities;
    attempts: readonly CapabilityRouteAttempt[];
};
export type CapabilityRoute<Input, Output> = {
    readonly id: string;
    readonly candidates: readonly CapabilityRouteCandidate[];
    run(kernel: LeanletKernel, input: Input, options?: CapabilityRouteRunOptions): Promise<CapabilityRouteResult<Output>>;
};
export declare function matchesRuntimeRequirements(requirements: LeanletRuntimeRequirements | undefined, capabilities: LeanletRuntimeCapabilities): {
    readonly compatible: boolean;
    readonly missing: string[];
};
/**
 * Create an ordered, inspectable route across registered Leanlets.
 *
 * Candidates are skipped when their declared requirements do not match the
 * supplied runtime profile. A candidate result advances only when its
 * `continueOn` explicitly includes that result status.
 */
export declare function defineCapabilityRoute<Input, Output>(definition: CapabilityRouteDefinition): CapabilityRoute<Input, Output>;
//# sourceMappingURL=capability-route.d.ts.map