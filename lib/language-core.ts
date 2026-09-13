export type LanguageModelId =
  | 'eld-extrasmall'
  | 'eld-small'
  | 'eld-medium'
  | 'eld-large';

export type LanguageAlternative = { code: string; language: string; score: number };

export type LanguageDetection = {
  code?: string;
  language: string;
  candidate?: string;
  score: number;
  reliable: boolean;
  warning?: string;
  modelId: LanguageModelId;
  alternatives: LanguageAlternative[];
};

export type LanguageModelProfile = {
  id: LanguageModelId;
  name: string;
  detail: string;
  estimatedTransferBytes: number;
  estimatedResidentBytes: number;
  quality: 'fastest' | 'balanced' | 'highest';
};

export type EldResult = {
  language: string;
  getScores(): Record<string, number>;
  isReliable(): boolean;
};

export type Eld = { detect(text: string): EldResult };

export const LANGUAGE_MODEL_PROFILES: readonly LanguageModelProfile[] = [
  { id: 'eld-extrasmall', name: 'ELD Extra Small', detail: '~294 KB gzip · 60 languages', estimatedTransferBytes: 294 * 1024, estimatedResidentBytes: 37 * 1024 * 1024, quality: 'fastest' },
  { id: 'eld-small', name: 'ELD Small', detail: '~477 KB gzip · 60 languages', estimatedTransferBytes: 477 * 1024, estimatedResidentBytes: 54 * 1024 * 1024, quality: 'balanced' },
  { id: 'eld-medium', name: 'ELD Medium', detail: '~586 KB gzip · 60 languages', estimatedTransferBytes: 586 * 1024, estimatedResidentBytes: 71 * 1024 * 1024, quality: 'balanced' },
  { id: 'eld-large', name: 'ELD Large', detail: '~1.28 MB gzip · 60 languages', estimatedTransferBytes: 1.28 * 1024 * 1024, estimatedResidentBytes: 138 * 1024 * 1024, quality: 'highest' },
] as const;

export const DEFAULT_LANGUAGE_MODEL: LanguageModelId = 'eld-extrasmall';

const displayNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'language' })
  : undefined;

function languageName(code: string) {
  try { return displayNames?.of(code) ?? code; } catch { return code; }
}

export function normalizeLanguageResult(modelId: LanguageModelId, result: EldResult): LanguageDetection {
  const scores = Object.entries(result.getScores())
    .filter((entry): entry is [string, number] => Number.isFinite(entry[1]))
    .sort((left, right) => right[1] - left[1]);
  const code = result.language || scores[0]?.[0];
  const candidate = code ? languageName(code) : undefined;
  const score = code ? (scores.find(([key]) => key === code)?.[1] ?? 0) : 0;
  const reliable = Boolean(code) && result.isReliable();
  const warning = reliable
    ? undefined
    : code
      ? `Low-confidence result. Add more text or require review; the leading candidate is ${candidate}.`
      : 'No dependable language signal was found. Add more text or require review.';
  return {
    code,
    language: reliable ? candidate ?? code ?? 'Unknown' : 'Uncertain',
    candidate,
    score,
    reliable,
    warning,
    modelId,
    alternatives: scores.slice(0, 3).map(([alternativeCode, alternativeScore]) => ({ code: alternativeCode, language: languageName(alternativeCode), score: alternativeScore })),
  };
}

export function languageModelProfile(modelId: LanguageModelId) {
  const profile = LANGUAGE_MODEL_PROFILES.find((candidate) => candidate.id === modelId);
  if (!profile) throw new Error(`Unknown language model: ${modelId}`);
  return profile;
}
