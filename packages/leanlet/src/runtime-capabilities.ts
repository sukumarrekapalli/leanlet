export type LeanletWebGpuUnavailableReason =
  | 'api-unavailable'
  | 'adapter-unavailable'
  | 'probe-failed';

export type LeanletRuntimeCapabilities = {
  /** Versioned so persisted diagnostics can be interpreted safely. */
  readonly schemaVersion: 1;
  readonly webAssembly: boolean;
  readonly workers: boolean;
  readonly sharedArrayBuffer: boolean;
  readonly crossOriginIsolated: boolean;
  readonly webgpu:
    | {
        readonly available: true;
        /** Standardized feature names only; adapter identity is intentionally omitted. */
        readonly features: readonly string[];
      }
    | {
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

function available(value: unknown) {
  return typeof value !== 'undefined';
}

/**
 * Inspect the browser primitives Leanlet routes may require.
 *
 * The profile intentionally excludes adapter names, vendors, memory, and other
 * high-entropy properties. Probing never downloads assets or initializes a
 * model runtime.
 */
export async function probeRuntimeCapabilities(
  options: RuntimeCapabilityProbeOptions = {},
): Promise<LeanletRuntimeCapabilities> {
  const browserNavigator =
    options.navigator ??
    (typeof navigator === 'undefined'
      ? undefined
      : (navigator as NavigatorLike));
  const base = {
    schemaVersion: 1 as const,
    webAssembly:
      options.webAssembly ?? available(globalThis.WebAssembly),
    workers: options.workers ?? available(globalThis.Worker),
    sharedArrayBuffer:
      options.sharedArrayBuffer ?? available(globalThis.SharedArrayBuffer),
    crossOriginIsolated:
      options.crossOriginIsolated ?? globalThis.crossOriginIsolated === true,
  };

  if (!browserNavigator?.gpu)
    return {
      ...base,
      webgpu: {
        available: false,
        features: [],
        reason: 'api-unavailable',
      },
    };

  try {
    const adapter = await browserNavigator.gpu.requestAdapter();
    if (!adapter)
      return {
        ...base,
        webgpu: {
          available: false,
          features: [],
          reason: 'adapter-unavailable',
        },
      };
    return {
      ...base,
      webgpu: {
        available: true,
        features: Object.freeze(
          [...(adapter.features ?? [])].map(String).sort(),
        ),
      },
    };
  } catch {
    return {
      ...base,
      webgpu: {
        available: false,
        features: [],
        reason: 'probe-failed',
      },
    };
  }
}
