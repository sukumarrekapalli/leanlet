import type { LeanletWorkerEvent } from './leanlet-types';

export type LeanletListener = (event: LeanletWorkerEvent) => void;

export class VisionLeanlet {
  private worker: Worker;
  private listeners = new Set<LeanletListener>();

  constructor() {
    this.worker = new Worker(new URL('../workers/vision.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = ({ data }: MessageEvent<LeanletWorkerEvent>) => {
      this.listeners.forEach((listener) => listener(data));
    };
    this.worker.postMessage({ type: 'configure', assetBase: new URL('.', document.baseURI).href });
  }

  subscribe(listener: LeanletListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  classify(file: File) {
    this.worker.postMessage({ type: 'classify', file });
  }

  warmup() {
    this.worker.postMessage({ type: 'warmup' });
  }

  destroy() {
    this.worker.terminate();
    this.listeners.clear();
  }
}

