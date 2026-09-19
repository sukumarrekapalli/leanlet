function available(value) {
    return typeof value !== 'undefined';
}
/**
 * Inspect the browser primitives Leanlet routes may require.
 *
 * The profile intentionally excludes adapter names, vendors, memory, and other
 * high-entropy properties. Probing never downloads assets or initializes a
 * model runtime.
 */
export async function probeRuntimeCapabilities(options = {}) {
    const browserNavigator = options.navigator ??
        (typeof navigator === 'undefined'
            ? undefined
            : navigator);
    const base = {
        schemaVersion: 1,
        webAssembly: options.webAssembly ?? available(globalThis.WebAssembly),
        workers: options.workers ?? available(globalThis.Worker),
        sharedArrayBuffer: options.sharedArrayBuffer ?? available(globalThis.SharedArrayBuffer),
        crossOriginIsolated: options.crossOriginIsolated ?? globalThis.crossOriginIsolated === true,
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
                features: Object.freeze([...(adapter.features ?? [])].map(String).sort()),
            },
        };
    }
    catch {
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
//# sourceMappingURL=runtime-capabilities.js.map