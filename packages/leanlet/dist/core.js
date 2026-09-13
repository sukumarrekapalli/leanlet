export class LeanletError extends Error {
    code;
    cause;
    constructor(code, message, cause) {
        super(message);
        this.name = 'LeanletError';
        this.code = code;
        this.cause = cause;
    }
}
const DEFAULT_BUDGET = {
    maxConcurrentRuns: 2,
    maxResidentBytes: 256 * 1024 * 1024,
    defaultDeadlineMs: 5_000,
};
const DEFAULT_POLICY = {
    network: 'static-assets',
    allowedProviders: [
        'javascript',
        'wasm-single',
        'wasm-threaded',
        'webgpu',
        'webnn',
    ],
};
const EXECUTION_PROVIDERS = new Set([
    'javascript',
    'wasm-single',
    'wasm-threaded',
    'webgpu',
    'webnn',
]);
const NETWORK_CLASSES = new Set([
    'deny',
    'static-assets',
    'application-managed',
]);
function now() {
    return typeof performance === 'undefined' ? Date.now() : performance.now();
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function isNetworkAllowed(requested, allowed) {
    const rank = { deny: 0, 'static-assets': 1, 'application-managed': 2 };
    return rank[requested ?? 'deny'] <= rank[allowed];
}
export function accepted(output, options = {}) {
    return { status: 'accepted', output, ...options };
}
export function abstained(reason, candidates) {
    return { status: 'abstained', reason, candidates };
}
export class LeanletKernel {
    budget;
    policy;
    selectProvider;
    slots = new Map();
    listeners = new Set();
    queue = [];
    coalesced = new Map();
    activeControllers = new Map();
    activeExecutions = new Map();
    lifecycleGate = Promise.resolve();
    activeRuns = 0;
    destroyed = false;
    completedRuns = 0;
    coalescedRuns = 0;
    evictions = 0;
    constructor(options = {}) {
        this.budget = { ...DEFAULT_BUDGET, ...options.budget };
        this.policy = { ...DEFAULT_POLICY, ...options.policy };
        this.selectProvider =
            options.selectProvider ??
                ((manifest, allowed) => manifest.providers.find((provider) => allowed.includes(provider)));
        if (!Number.isInteger(this.budget.maxConcurrentRuns) ||
            this.budget.maxConcurrentRuns < 1)
            throw new RangeError('maxConcurrentRuns must be a positive integer.');
        if (!Number.isFinite(this.budget.maxResidentBytes) ||
            this.budget.maxResidentBytes < 0)
            throw new RangeError('maxResidentBytes must be a finite, non-negative number.');
        if (!Number.isFinite(this.budget.defaultDeadlineMs) ||
            this.budget.defaultDeadlineMs < 1)
            throw new RangeError('defaultDeadlineMs must be a finite, positive number.');
    }
    register(definition) {
        this.assertActive();
        this.validateManifest(definition.manifest);
        const { id } = definition.manifest;
        if (this.slots.has(id))
            throw new LeanletError('DUPLICATE_ID', `A Leanlet with id "${id}" is already registered.`);
        this.slots.set(id, {
            definition: definition,
            loaded: false,
            activeRuns: 0,
            lastUsed: 0,
        });
        this.emit({ type: 'registered', leanletId: id, timestamp: now() });
        return this;
    }
    has(id) {
        return this.slots.has(id);
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    async prewarm(id, options = {}) {
        this.assertActive();
        this.validateRunOptions(options);
        const slot = this.getSlot(id);
        if (!isNetworkAllowed(slot.definition.manifest.network, this.policy.network))
            throw new LeanletError('LOAD_FAILED', `Network policy denied prewarming Leanlet "${id}".`);
        if (this.activeRuns >= this.budget.maxConcurrentRuns)
            throw new LeanletError('BUDGET_EXCEEDED', `Cannot prewarm Leanlet "${id}" while the concurrency budget is full.`);
        const controller = this.createController(options, now());
        const provider = this.resolveProvider(slot.definition.manifest);
        const requestId = crypto.randomUUID();
        slot.activeRuns += 1;
        this.activeRuns += 1;
        this.activeControllers.set(requestId, controller.controller);
        const execution = this.ensureLoaded(slot, this.context(id, requestId, controller, provider));
        this.activeExecutions.set(requestId, execution);
        try {
            await execution;
        }
        finally {
            slot.activeRuns -= 1;
            slot.lastUsed = now();
            this.activeRuns -= 1;
            this.activeControllers.delete(requestId);
            this.activeExecutions.delete(requestId);
            controller.cleanup();
            this.drain();
        }
    }
    run(leanletId, input, options = {}) {
        this.assertActive();
        this.getSlot(leanletId);
        this.validateRunOptions(options);
        const priority = options.priority ?? 0;
        const coalesceId = options.coalesceKey
            ? `${leanletId}\u0000${options.coalesceKey}`
            : undefined;
        const existing = coalesceId ? this.coalesced.get(coalesceId) : undefined;
        if (existing) {
            this.coalescedRuns += 1;
            this.emit({
                type: 'coalesced',
                leanletId,
                requestId: crypto.randomUUID(),
                timestamp: now(),
                detail: { coalesceKey: options.coalesceKey },
            });
            return this.waitForCaller(existing, options.signal);
        }
        const requestId = crypto.randomUUID();
        const queuedAt = now();
        const sharedOptions = coalesceId
            ? { ...options, signal: undefined }
            : options;
        const execution = new Promise((resolve) => {
            const deadline = queuedAt + (sharedOptions.deadlineMs ?? this.budget.defaultDeadlineMs);
            const abort = () => {
                const index = this.queue.indexOf(queued);
                if (index < 0)
                    return;
                this.queue.splice(index, 1);
                queued.cleanup();
                this.emit({
                    type: 'abstained',
                    leanletId,
                    requestId,
                    timestamp: now(),
                    detail: { reason: 'cancelled', phase: 'queued' },
                });
                this.completedRuns += 1;
                resolve({ status: 'abstained', reason: 'cancelled' });
            };
            const queued = {
                leanletId,
                requestId,
                input,
                options: sharedOptions,
                queuedAt,
                deadline,
                priority,
                cleanup: () => sharedOptions.signal?.removeEventListener('abort', abort),
                resolve: resolve,
            };
            sharedOptions.signal?.addEventListener('abort', abort, { once: true });
            this.queue.push(queued);
            this.queue.sort((left, right) => right.priority - left.priority ||
                left.deadline - right.deadline ||
                left.queuedAt - right.queuedAt);
            this.emit({
                type: 'queued',
                leanletId,
                requestId,
                timestamp: queuedAt,
            });
            this.drain();
        });
        if (!coalesceId)
            return execution;
        const shared = execution;
        this.coalesced.set(coalesceId, shared);
        void shared.finally(() => {
            if (this.coalesced.get(coalesceId) === shared)
                this.coalesced.delete(coalesceId);
        });
        return this.waitForCaller(execution, options.signal);
    }
    async dispose(id) {
        const slot = this.getSlot(id);
        await this.withLifecycleLock(async () => {
            if (slot.activeRuns)
                throw new LeanletError('DISPOSE_FAILED', `Cannot dispose Leanlet "${id}" while it is running.`);
            await this.disposeSlot(slot);
        });
    }
    async unregister(id) {
        const slot = this.getSlot(id);
        if (this.queue.some((request) => request.leanletId === id))
            throw new LeanletError('DISPOSE_FAILED', `Cannot unregister Leanlet "${id}" while requests are queued.`);
        await this.dispose(id);
        this.slots.delete(id);
        this.emit({ type: 'unregistered', leanletId: id, timestamp: now() });
        void slot;
    }
    inspect() {
        const leanlets = [...this.slots.values()].map((slot) => ({
            id: slot.definition.manifest.id,
            version: slot.definition.manifest.version,
            task: slot.definition.manifest.task,
            state: slot.loaded
                ? 'loaded'
                : slot.statePromise
                    ? 'loading'
                    : 'unloaded',
            activeRuns: slot.activeRuns,
            estimatedResidentBytes: slot.definition.manifest.estimatedResidentBytes ?? 0,
        }));
        return {
            destroyed: this.destroyed,
            activeRuns: this.activeRuns,
            queuedRuns: this.queue.length,
            declaredResidentBytes: leanlets
                .filter((leanlet) => leanlet.state === 'loaded')
                .reduce((sum, leanlet) => sum + leanlet.estimatedResidentBytes, 0),
            telemetry: {
                completedRuns: this.completedRuns,
                coalescedRuns: this.coalescedRuns,
                evictions: this.evictions,
            },
            leanlets,
        };
    }
    async destroy() {
        if (this.destroyed)
            return;
        this.destroyed = true;
        for (const request of this.queue.splice(0)) {
            request.cleanup();
            const error = new LeanletError('DESTROYED', 'Leanlet kernel was destroyed.');
            this.emit({
                type: 'failed',
                leanletId: request.leanletId,
                requestId: request.requestId,
                timestamp: now(),
                detail: { code: error.code, phase: 'queued' },
            });
            request.resolve({ status: 'failed', recoverable: false, error });
            this.completedRuns += 1;
        }
        for (const controller of this.activeControllers.values())
            controller.abort(new LeanletError('DESTROYED', 'Leanlet kernel was destroyed.'));
        await Promise.allSettled(this.activeExecutions.values());
        const disposals = await Promise.allSettled([...this.slots.values()].map((slot) => this.disposeSlot(slot)));
        this.slots.clear();
        this.listeners.clear();
        const failedDisposal = disposals.find((result) => result.status === 'rejected');
        if (failedDisposal)
            throw failedDisposal.reason;
    }
    drain() {
        while (!this.destroyed &&
            this.activeRuns < this.budget.maxConcurrentRuns &&
            this.queue.length) {
            const request = this.queue.shift();
            request.cleanup();
            if (request.options.signal?.aborted) {
                this.emit({
                    type: 'abstained',
                    leanletId: request.leanletId,
                    requestId: request.requestId,
                    timestamp: now(),
                    detail: { reason: 'cancelled', phase: 'queued' },
                });
                this.completedRuns += 1;
                request.resolve({ status: 'abstained', reason: 'cancelled' });
                continue;
            }
            if (now() >= request.deadline) {
                this.emit({
                    type: 'abstained',
                    leanletId: request.leanletId,
                    requestId: request.requestId,
                    timestamp: now(),
                    detail: { reason: 'deadline-exceeded', phase: 'queued' },
                });
                this.completedRuns += 1;
                request.resolve({
                    status: 'abstained',
                    reason: 'deadline-exceeded',
                });
                continue;
            }
            this.activeRuns += 1;
            const execution = this.execute(request);
            this.activeExecutions.set(request.requestId, execution);
            void execution.finally(() => {
                this.activeExecutions.delete(request.requestId);
                this.activeRuns -= 1;
                this.drain();
            });
        }
    }
    async execute(request) {
        const startedAt = now();
        const slot = this.getSlot(request.leanletId);
        const controller = this.createController(request.options, request.queuedAt);
        this.activeControllers.set(request.requestId, controller.controller);
        let provenance;
        let loadMs = 0;
        let runStarted = 0;
        slot.activeRuns += 1;
        const settle = (result) => {
            const finishedAt = now();
            const timing = {
                queuedMs: startedAt - request.queuedAt,
                loadMs,
                runMs: runStarted ? finishedAt - runStarted : 0,
                totalMs: finishedAt - request.queuedAt,
            };
            const enriched = {
                ...result,
                timing,
                ...(provenance ? { provenance } : {}),
            };
            this.emit({
                type: result.status === 'accepted'
                    ? 'completed'
                    : result.status === 'abstained'
                        ? 'abstained'
                        : 'failed',
                leanletId: request.leanletId,
                requestId: request.requestId,
                timestamp: finishedAt,
                detail: {
                    status: result.status,
                    totalMs: timing.totalMs,
                    ...(result.status === 'abstained' ? { reason: result.reason } : {}),
                },
            });
            request.resolve(enriched);
            this.completedRuns += 1;
        };
        try {
            const provider = this.resolveProvider(slot.definition.manifest);
            provenance = {
                leanletId: request.leanletId,
                leanletVersion: slot.definition.manifest.version,
                provider,
            };
            const context = this.context(request.leanletId, request.requestId, controller, provider);
            this.emit({
                type: 'started',
                leanletId: request.leanletId,
                requestId: request.requestId,
                timestamp: startedAt,
                detail: { provider },
            });
            if (!isNetworkAllowed(slot.definition.manifest.network, this.policy.network))
                return settle({
                    status: 'abstained',
                    reason: 'policy-denied',
                });
            const loadStarted = now();
            await this.ensureLoaded(slot, context);
            loadMs = now() - loadStarted;
            if (controller.signal.aborted)
                return settle({
                    status: 'abstained',
                    reason: now() >= context.deadline ? 'deadline-exceeded' : 'cancelled',
                });
            runStarted = now();
            const result = await slot.definition.run(request.input, slot.state, context);
            settle(result);
        }
        catch (error) {
            if (error instanceof LeanletError && error.code === 'BUDGET_EXCEEDED') {
                settle({
                    status: 'abstained',
                    reason: 'budget-exceeded',
                });
                return;
            }
            const wrapped = error instanceof LeanletError
                ? error
                : new LeanletError(runStarted ? 'RUN_FAILED' : 'LOAD_FAILED', errorMessage(error), error);
            const finishedAt = now();
            this.emit({
                type: 'failed',
                leanletId: request.leanletId,
                requestId: request.requestId,
                timestamp: finishedAt,
                detail: { code: wrapped.code, message: wrapped.message },
            });
            request.resolve({
                status: 'failed',
                error: wrapped,
                recoverable: wrapped.code !== 'UNSUPPORTED_PROVIDER',
                timing: {
                    queuedMs: startedAt - request.queuedAt,
                    loadMs,
                    runMs: runStarted ? finishedAt - runStarted : 0,
                    totalMs: finishedAt - request.queuedAt,
                },
                ...(provenance ? { provenance } : {}),
            });
            this.completedRuns += 1;
        }
        finally {
            slot.activeRuns -= 1;
            slot.lastUsed = now();
            this.activeControllers.delete(request.requestId);
            controller.cleanup();
        }
    }
    async ensureLoaded(slot, context) {
        if (slot.statePromise) {
            await slot.statePromise;
            return;
        }
        let loading;
        await this.withLifecycleLock(async () => {
            if (slot.statePromise) {
                loading = slot.statePromise;
                return;
            }
            await this.makeRoom(slot);
            slot.statePromise = Promise.resolve(slot.definition.load?.(context))
                .then((state) => {
                slot.state = state;
                slot.loaded = true;
                this.emit({
                    type: 'loaded',
                    leanletId: slot.definition.manifest.id,
                    timestamp: now(),
                });
                return state;
            })
                .catch((error) => {
                slot.statePromise = undefined;
                slot.state = undefined;
                slot.loaded = false;
                throw error;
            });
            loading = slot.statePromise;
        });
        if (!loading)
            throw new LeanletError('LOAD_FAILED', `Leanlet "${slot.definition.manifest.id}" did not create a load promise.`);
        await loading;
    }
    async makeRoom(incoming) {
        const incomingBytes = incoming.definition.manifest.estimatedResidentBytes ?? 0;
        if (incomingBytes > this.budget.maxResidentBytes)
            throw new LeanletError('BUDGET_EXCEEDED', `Leanlet "${incoming.definition.manifest.id}" exceeds the resident-memory budget.`);
        let resident = this.currentResidentBytes();
        const candidates = [...this.slots.values()]
            .filter((slot) => slot !== incoming && slot.statePromise && slot.activeRuns === 0)
            .sort((a, b) => a.lastUsed - b.lastUsed);
        while (resident + incomingBytes > this.budget.maxResidentBytes &&
            candidates.length) {
            const candidate = candidates.shift();
            resident -= candidate.definition.manifest.estimatedResidentBytes ?? 0;
            await this.disposeSlot(candidate);
            this.evictions += 1;
        }
        if (resident + incomingBytes > this.budget.maxResidentBytes)
            throw new LeanletError('BUDGET_EXCEEDED', `Loading "${incoming.definition.manifest.id}" would exceed the resident-memory budget.`);
    }
    currentResidentBytes() {
        return [...this.slots.values()]
            .filter((slot) => slot.statePromise)
            .reduce((sum, slot) => sum + (slot.definition.manifest.estimatedResidentBytes ?? 0), 0);
    }
    async disposeSlot(slot) {
        if (!slot.statePromise)
            return;
        try {
            const state = await slot.statePromise;
            await slot.definition.dispose?.(state);
        }
        catch (error) {
            throw new LeanletError('DISPOSE_FAILED', `Failed to dispose Leanlet "${slot.definition.manifest.id}": ${errorMessage(error)}`, error);
        }
        finally {
            slot.statePromise = undefined;
            slot.state = undefined;
            slot.loaded = false;
            slot.lastUsed = 0;
        }
        this.emit({
            type: 'disposed',
            leanletId: slot.definition.manifest.id,
            timestamp: now(),
        });
    }
    context(leanletId, requestId, controller, provider) {
        return {
            requestId,
            signal: controller.signal,
            deadline: controller.deadline,
            provider,
            emit: (detail) => this.emit({
                type: 'diagnostic',
                leanletId,
                requestId,
                timestamp: now(),
                detail,
            }),
        };
    }
    createController(options, startedAt) {
        const controller = new AbortController();
        const deadline = startedAt + (options.deadlineMs ?? this.budget.defaultDeadlineMs);
        const abort = () => controller.abort(options.signal?.reason);
        options.signal?.addEventListener('abort', abort, { once: true });
        const timeout = setTimeout(() => controller.abort(new Error('Leanlet deadline exceeded.')), Math.max(0, deadline - now()));
        return {
            controller,
            signal: controller.signal,
            deadline,
            cleanup() {
                clearTimeout(timeout);
                options.signal?.removeEventListener('abort', abort);
            },
        };
    }
    resolveProvider(manifest) {
        const provider = this.selectProvider(manifest, this.policy.allowedProviders);
        if (!provider || !manifest.providers.includes(provider))
            throw new LeanletError('UNSUPPORTED_PROVIDER', `No allowed execution provider is available for Leanlet "${manifest.id}".`);
        return provider;
    }
    getSlot(id) {
        const slot = this.slots.get(id);
        if (!slot)
            throw new LeanletError('NOT_REGISTERED', `Leanlet "${id}" is not registered.`);
        return slot;
    }
    assertActive() {
        if (this.destroyed)
            throw new LeanletError('DESTROYED', 'Leanlet kernel was destroyed.');
    }
    validateManifest(manifest) {
        if (!manifest.id.trim())
            throw new TypeError('Leanlet manifest id cannot be empty.');
        if (!manifest.version.trim())
            throw new TypeError(`Leanlet "${manifest.id}" version cannot be empty.`);
        if (!manifest.task.trim())
            throw new TypeError(`Leanlet "${manifest.id}" task cannot be empty.`);
        if (!manifest.providers.length)
            throw new TypeError(`Leanlet "${manifest.id}" must declare at least one provider.`);
        if (manifest.providers.some((provider) => !EXECUTION_PROVIDERS.has(provider)))
            throw new TypeError(`Leanlet "${manifest.id}" declares an unknown provider.`);
        if (manifest.network !== undefined && !NETWORK_CLASSES.has(manifest.network))
            throw new TypeError(`Leanlet "${manifest.id}" declares an unknown network class.`);
        if (manifest.estimatedResidentBytes !== undefined &&
            (!Number.isFinite(manifest.estimatedResidentBytes) ||
                manifest.estimatedResidentBytes < 0))
            throw new RangeError(`Leanlet "${manifest.id}" estimatedResidentBytes must be finite and non-negative.`);
        for (const asset of manifest.assets ?? []) {
            if (!asset.path.trim())
                throw new TypeError(`Leanlet "${manifest.id}" contains an asset with an empty path.`);
            if (!Number.isFinite(asset.bytes) || asset.bytes < 0)
                throw new RangeError(`Leanlet "${manifest.id}" asset "${asset.path}" bytes must be finite and non-negative.`);
        }
    }
    validateRunOptions(options) {
        if (options.priority !== undefined && !Number.isFinite(options.priority))
            throw new RangeError('priority must be a finite number.');
        if (options.deadlineMs !== undefined &&
            (!Number.isFinite(options.deadlineMs) || options.deadlineMs < 1))
            throw new RangeError('deadlineMs must be a finite, positive number.');
        if (options.coalesceKey !== undefined && options.coalesceKey.length === 0)
            throw new TypeError('coalesceKey cannot be empty.');
    }
    emit(event) {
        for (const listener of this.listeners) {
            try {
                listener(event);
            }
            catch {
                // Observability must never alter scheduling or inference semantics.
            }
        }
    }
    async withLifecycleLock(run) {
        const previous = this.lifecycleGate;
        let release;
        this.lifecycleGate = new Promise((resolve) => {
            release = resolve;
        });
        await previous;
        try {
            return await run();
        }
        finally {
            release();
        }
    }
    waitForCaller(execution, signal) {
        if (!signal)
            return execution;
        if (signal.aborted)
            return Promise.resolve({ status: 'abstained', reason: 'cancelled' });
        return new Promise((resolve) => {
            const abort = () => resolve({ status: 'abstained', reason: 'cancelled' });
            signal.addEventListener('abort', abort, { once: true });
            void execution.then((result) => {
                signal.removeEventListener('abort', abort);
                resolve(result);
            });
        });
    }
}
export function createLeanletKernel(options = {}) {
    return new LeanletKernel(options);
}
//# sourceMappingURL=core.js.map