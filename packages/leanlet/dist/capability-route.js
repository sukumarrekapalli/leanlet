import { probeRuntimeCapabilities, } from './runtime-capabilities.js';
function clock() {
    return typeof performance === 'undefined' ? Date.now() : performance.now();
}
function unmetRequirements(requirements, capabilities) {
    if (!requirements)
        return [];
    const missing = [];
    for (const key of [
        'webAssembly',
        'workers',
        'sharedArrayBuffer',
        'crossOriginIsolated',
    ]) {
        if (typeof requirements[key] === 'boolean' &&
            requirements[key] !== capabilities[key])
            missing.push(key);
    }
    if (typeof requirements.webgpu === 'boolean' &&
        requirements.webgpu !== capabilities.webgpu.available)
        missing.push('webgpu');
    if (requirements.webgpuFeatures?.length) {
        if (!capabilities.webgpu.available)
            missing.push('webgpu');
        else {
            const available = new Set(capabilities.webgpu.features);
            for (const feature of requirements.webgpuFeatures)
                if (!available.has(feature))
                    missing.push(`webgpu:${feature}`);
        }
    }
    return [...new Set(missing)];
}
export function matchesRuntimeRequirements(requirements, capabilities) {
    const missing = unmetRequirements(requirements, capabilities);
    return { compatible: missing.length === 0, missing };
}
/**
 * Create an ordered, inspectable route across registered Leanlets.
 *
 * Candidates are skipped when their declared requirements do not match the
 * supplied runtime profile. A candidate result advances only when its
 * `continueOn` explicitly includes that result status.
 */
export function defineCapabilityRoute(definition) {
    if (!definition.id.trim())
        throw new TypeError('Capability route id cannot be empty.');
    if (!definition.candidates.length)
        throw new TypeError('Capability route requires at least one candidate.');
    const ids = new Set();
    const candidates = definition.candidates.map((candidate) => {
        if (!candidate.leanletId.trim())
            throw new TypeError('Capability route candidate id cannot be empty.');
        if (ids.has(candidate.leanletId))
            throw new TypeError(`Capability route candidate "${candidate.leanletId}" is duplicated.`);
        if (candidate.requires?.webgpu === false &&
            candidate.requires.webgpuFeatures?.length)
            throw new TypeError(`Capability route candidate "${candidate.leanletId}" cannot require WebGPU features while requiring WebGPU to be unavailable.`);
        if (candidate.requires?.webgpuFeatures?.some((feature) => !feature.trim()))
            throw new TypeError('WebGPU feature names cannot be empty.');
        if (candidate.continueOn?.some((status) => status !== 'failed' && status !== 'abstained'))
            throw new TypeError('Capability route continueOn supports only failed and abstained.');
        ids.add(candidate.leanletId);
        const requires = candidate.requires
            ? Object.freeze({
                ...candidate.requires,
                webgpuFeatures: candidate.requires.webgpuFeatures
                    ? Object.freeze([...candidate.requires.webgpuFeatures])
                    : undefined,
            })
            : undefined;
        return Object.freeze({
            ...candidate,
            requires,
            continueOn: candidate.continueOn
                ? Object.freeze([...new Set(candidate.continueOn)])
                : undefined,
        });
    });
    return Object.freeze({
        id: definition.id,
        candidates: Object.freeze(candidates),
        async run(kernel, input, options = {}) {
            const capabilities = options.capabilities ??
                (await probeRuntimeCapabilities(options.probe));
            const attempts = [];
            const startedAt = clock();
            const { capabilities: _capabilities, probe: _probe, ...runOptions } = options;
            void _capabilities;
            void _probe;
            for (let index = 0; index < candidates.length; index += 1) {
                const candidate = candidates[index];
                const compatibility = matchesRuntimeRequirements(candidate.requires, capabilities);
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
                    };
                    return {
                        routeId: definition.id,
                        result,
                        fallbackUsed: index > 0,
                        capabilities,
                        attempts,
                    };
                }
                const remaining = runOptions.deadlineMs === undefined
                    ? undefined
                    : Math.max(0, runOptions.deadlineMs - (clock() - startedAt));
                if (remaining !== undefined && remaining <= 0) {
                    const result = {
                        status: 'abstained',
                        reason: 'deadline-exceeded',
                    };
                    return {
                        routeId: definition.id,
                        result,
                        fallbackUsed: index > 0,
                        capabilities,
                        attempts,
                    };
                }
                const result = await kernel.run(candidate.leanletId, input, {
                    ...runOptions,
                    deadlineMs: remaining,
                });
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
            };
            return {
                routeId: definition.id,
                result,
                fallbackUsed: false,
                capabilities,
                attempts,
            };
        },
    });
}
//# sourceMappingURL=capability-route.js.map