export type Prediction = { label: string; score: number };

export type CategoryResult = {
  category: string;
  confidence: number;
  object: string;
  predictions: Prediction[];
  elapsedMs: number;
};

export type LeanletWorkerEvent =
  | { type: 'status'; state: 'loading' | 'ready' | 'running'; message: string; progress?: number }
  | { type: 'result'; result: CategoryResult }
  | { type: 'error'; message: string };

