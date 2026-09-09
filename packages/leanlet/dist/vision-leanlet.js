import { DEFAULT_PRODUCT_CATEGORIES, LEANLET_MODELS } from './models.js';
export class VisionLeanlet {
    worker;
    listeners = new Set();
    pending = new Map();
    options;
    constructor(options = {}) {
        if (typeof Worker === 'undefined')
            throw new Error('VisionLeanlet requires a browser with Web Worker support.');
        this.options = {
            model: options.model ?? 'mobileclip-s0',
            categories: options.categories ?? DEFAULT_PRODUCT_CATEGORIES,
            assetBase: options.assetBase ??
                (typeof document === 'undefined'
                    ? '/'
                    : new URL('.', document.baseURI).href),
            threads: Math.max(1, Math.min(options.threads ?? 1, 4)),
            workerUrl: options.workerUrl,
            debug: options.debug ?? false,
        };
        this.createWorker();
    }
    get model() {
        return LEANLET_MODELS[this.options.model];
    }
    createWorker() {
        this.worker = this.options.workerUrl
            ? new Worker(this.options.workerUrl, {
                type: 'module',
                name: 'leanlet-vision',
            })
            : new Worker(new URL('./vision.worker.js', import.meta.url), {
                type: 'module',
                name: 'leanlet-vision',
            });
        this.worker.onmessage = ({ data }) => {
            if (this.options.debug)
                console.debug('[leanlet:vision]', data);
            if (data.type === 'result') {
                this.pending.get(data.requestId)?.resolve(data.result);
                this.pending.delete(data.requestId);
            }
            else if (data.type === 'error' && data.requestId) {
                this.pending.get(data.requestId)?.reject(new Error(data.message));
                this.pending.delete(data.requestId);
            }
            this.listeners.forEach((listener) => listener(data));
        };
        this.worker.onerror = (event) => {
            const error = new Error(event.message || 'Leanlet worker failed.');
            if (this.options.debug)
                console.error('[leanlet:vision] Worker error', error);
            this.pending.forEach(({ reject }) => reject(error));
            this.pending.clear();
        };
        this.worker.postMessage({ type: 'configure', ...this.options });
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    setModel(model) {
        if (model === this.options.model)
            return;
        this.worker.terminate();
        this.pending.forEach(({ reject }) => reject(new Error('Model changed before classification completed.')));
        this.pending.clear();
        this.options.model = model;
        this.createWorker();
    }
    warmup() {
        this.worker.postMessage({ type: 'warmup' });
    }
    classify(file, options = {}) {
        const requestId = crypto.randomUUID();
        const request = new Promise((resolve, reject) => this.pending.set(requestId, { resolve, reject }));
        this.worker.postMessage({
            type: 'classify',
            file,
            requestId,
            categories: options.categories,
        });
        return request;
    }
    destroy() {
        this.worker.terminate();
        this.pending.forEach(({ reject }) => reject(new Error('Leanlet was destroyed.')));
        this.pending.clear();
        this.listeners.clear();
    }
}
//# sourceMappingURL=vision-leanlet.js.map