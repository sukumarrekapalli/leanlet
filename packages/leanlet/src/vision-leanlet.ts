import { DEFAULT_PRODUCT_CATEGORIES, LEANLET_MODELS } from './models.js';
import type {
  CategoryResult,
  ClassifyOptions,
  LeanletEvent,
  LeanletModelId,
  VisionLeanletOptions,
} from './types.js';

type Listener = (event: LeanletEvent) => void;
type PendingRequest = {
  resolve: (result: CategoryResult) => void;
  reject: (error: Error) => void;
  cleanup: () => void;
};

export class VisionLeanlet {
  private worker!: Worker;
  private listeners = new Set<Listener>();
  private pending = new Map<string, PendingRequest>();
  private destroyed = false;
  private options: Required<Omit<VisionLeanletOptions, 'workerUrl'>> & {
    workerUrl?: URL;
  };

  constructor(options: VisionLeanletOptions = {}) {
    if (typeof Worker === 'undefined')
      throw new Error(
        'VisionLeanlet requires a browser with Web Worker support.',
      );
    this.options = {
      model: options.model ?? 'mobileclip-s0',
      categories: options.categories ?? DEFAULT_PRODUCT_CATEGORIES,
      assetBase:
        options.assetBase ??
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

  private createWorker() {
    this.worker = this.options.workerUrl
      ? new Worker(this.options.workerUrl, {
          type: 'module',
          name: 'leanlet-vision',
        })
      : new Worker(new URL('./vision.worker.js', import.meta.url), {
          type: 'module',
          name: 'leanlet-vision',
        });
    this.worker.onmessage = ({ data }: MessageEvent<LeanletEvent>) => {
      if (this.options.debug) console.debug('[leanlet:vision]', data);
      if (data.type === 'result') {
        const pending = this.pending.get(data.requestId);
        pending?.cleanup();
        pending?.resolve(data.result);
        this.pending.delete(data.requestId);
      } else if (data.type === 'error' && data.requestId) {
        const pending = this.pending.get(data.requestId);
        pending?.cleanup();
        pending?.reject(new Error(data.message));
        this.pending.delete(data.requestId);
      } else if (data.type === 'cancelled') {
        const pending = this.pending.get(data.requestId);
        pending?.cleanup();
        this.pending.delete(data.requestId);
      }
      this.listeners.forEach((listener) => listener(data));
    };
    this.worker.onerror = (event) => {
      const error = new Error(event.message || 'Leanlet worker failed.');
      if (this.options.debug)
        console.error('[leanlet:vision] Worker error', error);
      this.pending.forEach(({ reject, cleanup }) => {
        cleanup();
        reject(error);
      });
      this.pending.clear();
      this.listeners.forEach((listener) =>
        listener({
          type: 'error',
          message: error.message,
          modelId: this.options.model,
        }),
      );
    };
    this.worker.postMessage({ type: 'configure', ...this.options });
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setModel(model: LeanletModelId) {
    if (this.destroyed) throw new Error('VisionLeanlet was destroyed.');
    if (!LEANLET_MODELS[model])
      throw new Error(`Unknown Leanlet model "${model}".`);
    if (model === this.options.model) return;
    this.worker.terminate();
    this.pending.forEach(({ reject, cleanup }) => {
      cleanup();
      reject(new Error('Model changed before classification completed.'));
    });
    this.pending.clear();
    this.options.model = model;
    this.createWorker();
  }

  warmup() {
    if (this.destroyed) throw new Error('VisionLeanlet was destroyed.');
    this.worker.postMessage({ type: 'warmup' });
  }

  classify(file: Blob, options: ClassifyOptions = {}) {
    if (this.destroyed)
      return Promise.reject(new Error('VisionLeanlet was destroyed.'));
    if (options.signal?.aborted)
      return Promise.reject(this.abortError(options.signal.reason));
    const requestId = crypto.randomUUID();
    let abort = () => undefined;
    const request = new Promise<CategoryResult>((resolve, reject) => {
      abort = () => {
        const pending = this.pending.get(requestId);
        if (!pending) return;
        pending.cleanup();
        this.pending.delete(requestId);
        this.worker.postMessage({ type: 'cancel', requestId });
        reject(this.abortError(options.signal?.reason));
      };
      const cleanup = () => options.signal?.removeEventListener('abort', abort);
      this.pending.set(requestId, { resolve, reject, cleanup });
      options.signal?.addEventListener('abort', abort, { once: true });
    });
    this.worker.postMessage({
      type: 'classify',
      file,
      requestId,
      categories: options.categories,
    });
    return request;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.worker.terminate();
    this.pending.forEach(({ reject, cleanup }) => {
      cleanup();
      reject(new Error('Leanlet was destroyed.'));
    });
    this.pending.clear();
    this.listeners.clear();
  }

  private abortError(reason?: unknown) {
    const error = new Error(
      reason instanceof Error
        ? reason.message
        : 'Classification was cancelled.',
    );
    error.name = 'AbortError';
    return error;
  }
}
