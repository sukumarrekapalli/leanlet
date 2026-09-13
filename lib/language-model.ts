import {
  DEFAULT_LANGUAGE_MODEL,
  type LanguageDetection,
  type LanguageModelId,
} from './language-core.ts';

export * from './language-core.ts';

export interface LanguageDetector {
  readonly modelId: LanguageModelId;
  warmup(): Promise<void>;
  detect(text: string, signal?: AbortSignal): Promise<LanguageDetection>;
  destroy(): void;
}

type WorkerResponse =
  | { type: 'ready'; requestId: number }
  | { type: 'result'; requestId: number; result: LanguageDetection }
  | { type: 'error'; requestId: number; message: string };

function createModelWorker(modelId: LanguageModelId) {
  switch (modelId) {
    case 'eld-extrasmall':
      return new Worker(new URL('./language-extrasmall.worker.ts', import.meta.url), { type: 'module', name: 'leanlet-language-eld-extrasmall' });
    case 'eld-small':
      return new Worker(new URL('./language-small.worker.ts', import.meta.url), { type: 'module', name: 'leanlet-language-eld-small' });
    case 'eld-medium':
      return new Worker(new URL('./language-medium.worker.ts', import.meta.url), { type: 'module', name: 'leanlet-language-eld-medium' });
    case 'eld-large':
      return new Worker(new URL('./language-large.worker.ts', import.meta.url), { type: 'module', name: 'leanlet-language-eld-large' });
  }
}

class WorkerLanguageDetector implements LanguageDetector {
  readonly modelId: LanguageModelId;
  private worker: Worker;
  private nextRequestId = 0;
  private pending = new Map<number, { resolve(value: LanguageDetection | undefined): void; reject(reason?: unknown): void }>();

  constructor(modelId: LanguageModelId) {
    this.modelId = modelId;
    this.worker = createModelWorker(modelId);
    this.worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      const request = this.pending.get(data.requestId);
      if (!request) return;
      this.pending.delete(data.requestId);
      if (data.type === 'error') request.reject(new Error(data.message));
      else request.resolve(data.type === 'result' ? data.result : undefined);
    };
    this.worker.onerror = (event) => {
      const error = new Error(event.message || 'Language worker failed.');
      for (const request of this.pending.values()) request.reject(error);
      this.pending.clear();
    };
  }

  private request(type: 'warmup' | 'detect', text?: string, signal?: AbortSignal) {
    const requestId = ++this.nextRequestId;
    if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    return new Promise<LanguageDetection | undefined>((resolve, reject) => {
      const abort = () => {
        this.pending.delete(requestId);
        this.worker.postMessage({ type: 'cancel', requestId });
        reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', abort, { once: true });
      this.pending.set(requestId, {
        resolve: (value) => { signal?.removeEventListener('abort', abort); resolve(value); },
        reject: (reason) => { signal?.removeEventListener('abort', abort); reject(reason); },
      });
      this.worker.postMessage({ type, requestId, text });
    });
  }

  async warmup() { await this.request('warmup'); }

  async detect(text: string, signal?: AbortSignal) {
    const result = await this.request('detect', text, signal);
    if (!result) throw new Error('Language worker returned no result.');
    return result;
  }

  destroy() {
    this.worker.terminate();
    const error = new DOMException('Language detector was destroyed.', 'AbortError');
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }
}

export function createLanguageDetector(modelId: LanguageModelId = DEFAULT_LANGUAGE_MODEL) {
  if (typeof Worker === 'undefined')
    throw new Error('The language reference adapter requires browser Web Worker support.');
  return new WorkerLanguageDetector(modelId);
}
