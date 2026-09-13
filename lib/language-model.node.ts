import {
  normalizeLanguageResult,
  type Eld,
  type LanguageDetection,
  type LanguageModelId,
} from './language-core.ts';
import type { LanguageDetector } from './language-model.ts';

const modelLoaders: Record<LanguageModelId, () => Promise<{ eld: Eld }>> = {
  'eld-extrasmall': () => import('eld/extrasmall') as Promise<{ eld: Eld }>,
  'eld-small': () => import('eld/small') as Promise<{ eld: Eld }>,
  'eld-medium': () => import('eld/medium') as Promise<{ eld: Eld }>,
  'eld-large': () => import('eld/large') as Promise<{ eld: Eld }>,
};

class InProcessLanguageDetector implements LanguageDetector {
  readonly modelId: LanguageModelId;
  private model?: Eld;
  private loading?: Promise<Eld>;

  constructor(modelId: LanguageModelId) { this.modelId = modelId; }

  private load() {
    this.loading ??= modelLoaders[this.modelId]().then(({ eld }) => {
      this.model = eld;
      return eld;
    });
    return this.loading;
  }

  async warmup() { await this.load(); }

  async detect(text: string, signal?: AbortSignal): Promise<LanguageDetection> {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    const model = this.model ?? (await this.load());
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    return normalizeLanguageResult(this.modelId, model.detect(text));
  }

  destroy() {
    this.model = undefined;
    this.loading = undefined;
  }
}

export function createInProcessLanguageDetector(modelId: LanguageModelId) {
  return new InProcessLanguageDetector(modelId);
}
