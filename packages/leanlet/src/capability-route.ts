import type {
  KernelRunOptions,
  LeanletKernel,
  LeanletResult,
} from './core.js';
import {
  probeRuntimeCapabilities,
  type LeanletRuntimeCapabilities,
  type RuntimeCapabilityProbeOptions,
} from './runtime-capabilities.js';

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

export type CapabilityRouteAttempt =
  | {
      leanletId: string;
      status: 'incompatible';
      missing: readonly string[];
    }
  | {
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
  run(
    kernel: LeanletKernel,
    input: Input,
    options?: CapabilityRouteRunOptions,
  ): Promise<CapabilityRouteResult<Output>>;
};

function clock() {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function unmetRequirements(
  requirements: LeanletRuntimeRequirements | undefined,
  capabilities: LeanletRuntimeCapabilities,
) {
  if (!requirements) return [];
  const missing: string[] = [];
  for (const key of [
    'webAssembly',
    'workers',
    'sharedArrayBuffer',
    'crossOriginIsolated',
  ] as const) {
    if (
      typeof requirements[key] === 'boolean' &&
      requirements[key] !== capabilities[key]
    )
      missing.push(key);
  }
  if (
    typeof requirements.webgpu === 'boolean' &&
    requirements.webgpu !== capabilities.webgpu.available
  )
    missing.push('webgpu');
  if (requirements.webgpuFeatures?.length) {
    if (!capabilities.webgpu.available) missing.push('webgpu');
    else {
      const available = new Set(capabilities.webgpu.features);
      for (const feature of requirements.webgpuFeatures)
        if (!available.has(feature)) missing.push(`webgpu:${feature}`);
    }
  }
  return [...new Set(missing)];
}

export function matchesRuntimeRequirements(
  requirements: LeanletRuntimeRequirements | undefined,
  capabilities: LeanletRuntimeCapabilities,
) {
  const missing = unmetRequirements(requirements, capabilities);
  return { compatible: missing.length === 0, missing } as const;
}

/**
 * Create an ordered, inspectable route across registered Leanlets.
 *
 * Candidates are skipped when their declared requirements do not match the
 * supplied runtime profile. A candidate result advances only when its
 * `continueOn` explicitly includes that result status.
 */
export function defineCapabilityRoute<Input, Output>(
  definition: CapabilityRouteDefinition,
): CapabilityRoute<Input, Output> {
  if (!definition.id.trim())
    throw new TypeError('Capability route id cannot be empty.');
  if (!definition.candidates.length)
    throw new TypeError('Capability route requires at least one candidate.');
  const ids = new Set<string>();
  const candidates = definition.candidates.map((candidate) => {
    if (!candidate.leanletId.trim())
      throw new TypeError('Capability route candidate id cannot be empty.');
    if (ids.has(candidate.leanletId))
      throw new TypeError(
        `Capability route candidate "${candidate.leanletId}" is duplicated.`,
      );
    ids.add(candidate.leanletId);
    return Object.freeze({
      ...candidate,
      requires: candidate.requires
        ? Object.freeze({ ...candidate.requires })
        : undefined,
      continueOn: candidate.continueOn
        ? Object.freeze([...new Set(candidate.continueOn)])
        : undefined,
    });
  });

  return Object.freeze({
    id: definition.id,
    candidates: Object.freeze(candidates),
    async run(
      kernel: LeanletKernel,
      input: Input,
      options: CapabilityRouteRunOptions = {},
    ): Promise<CapabilityRouteResult<Output>> {
      const capabilities =
        options.capabilities ??
        (await probeRuntimeCapabilities(options.probe));
      const attempts: CapabilityRouteAttempt[] = [];
      const startedAt = clock();
      const { capabilities: _capabilities, probe: _probe, ...runOptions } =
        options;
      void _capabilities;
      void _probe;

      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        const compatibility = matchesRuntimeRequirements(
          candidate.requires,
          capabilities,
        );
        if (!compatibility.compatible) {
          attempts.push({
            leanletId: candidate.leanletId,
            status: 'incompatible',
            missing: compatibility.missing,
          });
          continue;
        }
        if (runOptions.signal?.aborted) {
          const result = {
            status: 'abstained',
            reason: 'cancelled',
          } as const;
          return {
            routeId: definition.id,
            result,
            fallbackUsed: index > 0,
            capabilities,
            attempts,
          };
        }
        const remaining =
          runOptions.deadlineMs === undefined
            ? undefined
            : Math.max(0, runOptions.deadlineMs - (clock() - startedAt));
        if (remaining !== undefined && remaining <= 0) {
          const result = {
            status: 'abstained',
            reason: 'deadline-exceeded',
          } as const;
          return {
            routeId: definition.id,
            result,
            fallbackUsed: index > 0,
            capabilities,
            attempts,
          };
        }
        const result = await kernel.run<Input, Output>(
          candidate.leanletId,
          input,
          {
            ...runOptions,
            deadlineMs: remaining,
          },
        );
        attempts.push({
          leanletId: candidate.leanletId,
          status: result.status,
          result,
        });
        if (result.status === 'accepted')
          return {
            routeId: definition.id,
            result,
            selectedLeanletId: candidate.leanletId,
            fallbackUsed: index > 0,
            capabilities,
            attempts,
          };
        if (!candidate.continueOn?.includes(result.status))
          return {
            routeId: definition.id,
            result,
            selectedLeanletId: candidate.leanletId,
            fallbackUsed: index > 0,
            capabilities,
            attempts,
          };
      }

      const result = {
        status: 'abstained',
        reason: 'unsupported-input',
        candidates: attempts,
      } as const;
      return {
        routeId: definition.id,
        result,
        fallbackUsed: attempts.length > 0,
        capabilities,
        attempts,
      };
    },
  });
}
