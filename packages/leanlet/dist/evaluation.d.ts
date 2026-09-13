import type { LeanletResult } from './core.js';
export type ClassificationEvaluationCase<Input, Label extends string> = {
    id: string;
    input: Input;
    expected: Label;
};
export type ClassificationEvaluationMetrics<Label extends string> = {
    total: number;
    accepted: number;
    abstained: number;
    failed: number;
    coverage: number;
    accuracy: number;
    acceptedAccuracy: number;
    macroF1: number;
    latencyMs: {
        p50: number;
        p95: number;
    };
    labels: Record<Label, {
        support: number;
        predicted: number;
        correct: number;
        precision: number;
        recall: number;
        f1: number;
    }>;
};
export declare function evaluateClassification<Input, Output, Label extends string>(cases: readonly ClassificationEvaluationCase<Input, Label>[], run: (input: Input) => Promise<LeanletResult<Output>>, labelOf: (output: Output) => Label): Promise<ClassificationEvaluationMetrics<Label>>;
//# sourceMappingURL=evaluation.d.ts.map