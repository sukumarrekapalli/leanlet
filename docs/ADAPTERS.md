# Authoring a Leanlet adapter

A Leanlet should do one bounded job. Prefer an output that can be evaluated
independently and composed as evidence by an application flow.

## Definition checklist

- Use a stable namespaced ID such as `search.query-embedding`.
- Version any input, output, preprocessing, threshold, or asset behavior change.
- Declare every execution provider the implementation actually supports.
- Declare the narrowest network class it needs.
- Estimate loaded resident bytes conservatively on supported device classes.
- List immutable assets with byte size, SHA-256, license, and source revision.
- Return `abstained` for expected inability to decide.
- Return `failed` for operational faults and mark recoverability deliberately.
- Observe `context.signal` and check `context.deadline` during divisible work.
- Release workers, sessions, GPU buffers, object URLs, and listeners in
  `dispose`.

## Minimal adapter

```ts
import { accepted, abstained, type KernelLeanletDefinition } from 'leanlet-ai';

export const detector: KernelLeanletDefinition<number[], boolean, Detector> = {
  manifest: {
    id: 'sensor.anomaly',
    version: '1.0.0',
    task: 'bounded-anomaly-detection',
    providers: ['wasm-single'],
    network: 'static-assets',
    estimatedResidentBytes: 2_500_000,
    assets: [
      {
        path: 'models/sensor-anomaly-v1.wasm',
        bytes: 812_420,
        sha256: '<release hash>',
        license: 'Apache-2.0',
        sourceRevision: '<source revision>',
      },
    ],
  },
  async load(context) {
    if (context.signal.aborted) throw context.signal.reason;
    return Detector.load('/models/sensor-anomaly-v1.wasm');
  },
  async run(values, model, context) {
    if (values.length < 8) return abstained('unsupported-input');
    if (context.signal.aborted) return abstained('cancelled');
    const output = await model.run(values);
    return output.score >= 0.8
      ? accepted(output.anomalous, { score: output.score })
      : abstained('low-score');
  },
  dispose(model) {
    model.close();
  },
};
```

## Adapter conformance tests

At minimum, test lazy single loading, repeated runtime reuse, concurrent runs,
pre-aborted input, mid-run cancellation, deadline behavior, load failure,
run failure, disposal, use after kernel destruction, declared budget rejection,
and event/provenance output. Test the adapter on real target browsers because
Node tests cannot validate worker, WASM, WebGPU, or mobile memory behavior.
