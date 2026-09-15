# Application checks

Checks turn a product requirement into a typed, inspectable decision while a
registered Leanlet owns the underlying computation. A check may delegate to a
deterministic function, local index, WASM worker, or model-backed Leanlet; the
application-facing contract is the same.

```ts
import {
  accepted,
  createLeanletKernel,
  defineCheck,
  defineModelLeanlet,
  runCheck,
} from 'leanlet-ai/kernel';

const kernel = createLeanletKernel();
kernel.register(defineModelLeanlet({
  id: 'editor.tone-model',
  version: '1.0.0',
  task: 'bounded-tone-signal',
  model: toneModelPack,
  load: loadToneModel,
  async run(text, model) {
    const signal = await model.classify(text);
    return signal.score < 0.55
      ? { status: 'abstained', reason: 'low-score', candidates: signal.labels }
      : accepted(signal, { score: signal.score });
  },
  dispose: (model) => model.dispose(),
}));

const calmTone = defineCheck({
  id: 'editor.calm-tone',
  version: '1.0.0',
  leanletId: 'editor.tone-model',
  prepare: (draft: { body: string; minimumScore: number }) => draft.body,
  decide: (signal, draft) => ({
    verdict: signal.calm >= draft.minimumScore ? 'pass' : 'review',
    message: `Calm-tone score ${signal.calm.toFixed(2)}`,
    evidence: signal,
    score: signal.calm,
  }),
});

const result = await runCheck(kernel, calmTone, {
  body: currentDraft,
  minimumScore: 0.7,
}, {
  signal: routeAbort.signal,
  deadlineMs: 1_500,
  coalesceKey: draftHash,
});
```

## Contract

- `defineCheck()` validates and freezes the check identity and routing contract.
- `prepare(subject)` creates the narrow input sent to the registered Leanlet.
- `leanletId` is resolved by the kernel; missing registration remains a kernel
  error rather than a silent fallback.
- `decide(output, subject)` runs only after the Leanlet accepts its input and
  returns `pass`, `review`, or `fail` with a human-readable message.
- `runCheck()` preserves kernel deadlines, cancellation, priority, coalescing,
  timing, and Leanlet provenance.
- An underlying abstention remains `status: 'abstained'`; it is never converted
  into pass. Runtime failure remains `status: 'failed'`.

Checks do not certify model accuracy, execute arbitrary prompt text, or isolate
application JavaScript. Version the check when its input mapping, threshold, or
decision meaning changes. Validate thresholds on representative product data,
show uncertain results in the UI, and keep consequential final decisions under
application policy or human review.
