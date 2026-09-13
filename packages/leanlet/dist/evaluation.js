function percentile(values, quantile) {
    if (!values.length)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(quantile * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}
export async function evaluateClassification(cases, run, labelOf) {
    const labels = new Map();
    const get = (label) => {
        const current = labels.get(label) ?? {
            support: 0,
            predicted: 0,
            correct: 0,
        };
        labels.set(label, current);
        return current;
    };
    let accepted = 0;
    let abstained = 0;
    let failed = 0;
    let correct = 0;
    const latencies = [];
    for (const evaluationCase of cases) {
        get(evaluationCase.expected).support += 1;
        const started = performance.now();
        const result = await run(evaluationCase.input);
        latencies.push(result.timing?.totalMs ?? performance.now() - started);
        if (result.status === 'failed') {
            failed += 1;
            continue;
        }
        if (result.status === 'abstained') {
            abstained += 1;
            continue;
        }
        accepted += 1;
        const predicted = labelOf(result.output);
        get(predicted).predicted += 1;
        if (predicted === evaluationCase.expected) {
            correct += 1;
            get(predicted).correct += 1;
        }
    }
    const byLabel = {};
    let f1Total = 0;
    for (const [label, counts] of labels) {
        const precision = counts.predicted ? counts.correct / counts.predicted : 0;
        const recall = counts.support ? counts.correct / counts.support : 0;
        const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
        byLabel[label] = { ...counts, precision, recall, f1 };
        f1Total += f1;
    }
    return {
        total: cases.length,
        accepted,
        abstained,
        failed,
        coverage: cases.length ? accepted / cases.length : 0,
        accuracy: cases.length ? correct / cases.length : 0,
        acceptedAccuracy: accepted ? correct / accepted : 0,
        macroF1: labels.size ? f1Total / labels.size : 0,
        latencyMs: {
            p50: percentile(latencies, 0.5),
            p95: percentile(latencies, 0.95),
        },
        labels: byLabel,
    };
}
//# sourceMappingURL=evaluation.js.map