/// <reference lib="webworker" />

import { normalizeLanguageResult, type Eld, type LanguageModelId } from './language-core.ts';

type Request =
  | { type: 'warmup'; requestId: number }
  | { type: 'detect'; requestId: number; text: string }
  | { type: 'cancel'; requestId: number };

export function installLanguageWorker(modelId: LanguageModelId, model: Eld) {
  const cancelled = new Set<number>();
  self.onmessage = ({ data }: MessageEvent<Request>) => {
    if (data.type === 'cancel') { cancelled.add(data.requestId); return; }
    try {
      if (cancelled.delete(data.requestId)) return;
      if (data.type === 'warmup') {
        self.postMessage({ type: 'ready', requestId: data.requestId });
        return;
      }
      const result = normalizeLanguageResult(modelId, model.detect(data.text));
      if (!cancelled.delete(data.requestId)) self.postMessage({ type: 'result', requestId: data.requestId, result });
    } catch (error) {
      if (!cancelled.delete(data.requestId)) self.postMessage({ type: 'error', requestId: data.requestId, message: error instanceof Error ? error.message : 'Language model failed.' });
    }
  };
}
