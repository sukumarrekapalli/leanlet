# leanlet-ai

Leanlet is a TypeScript runtime for coordinating bounded intelligence inside a
web application. A Leanlet can be a compact model, worker, local index,
statistical method, or rule. The kernel gives those capabilities one lifecycle,
resource budget, scheduler, result contract, and event stream.

Leanlet does not add telemetry or call an inference endpoint. Custom capability
code has the same browser privileges as the application; manifest policy is an
admission control, not a security sandbox.

## Install

```bash
npm install leanlet-ai
```

## Single-capability quickstart

The minimal API does not require a kernel:

```ts
import { defineLeanlet } from 'leanlet-ai';

const route = defineLeanlet<string, 'te' | 'en'>({
  id: 'language.route',
  infer: (text) => (/\p{Script=Telugu}/u.test(text) ? 'te' : 'en'),
});

const language = await route.run(message);
await route.destroy();
```

Use a kernel when multiple capabilities need shared scheduling, policy,
lifecycle, structured results, provenance, or resource budgets.

## Kernel quickstart

```ts
import { accepted, createLeanletKernel } from 'leanlet-ai';

const kernel = createLeanletKernel({
  budget: {
    maxConcurrentRuns: 2,
    maxResidentBytes: 128 * 1024 * 1024,
    defaultDeadlineMs: 2_000,
  },
  policy: {
    network: 'deny',
    allowedProviders: ['javascript'],
  },
});

kernel.register({
  manifest: {
    id: 'language.route',
    version: '1.0.0',
    task: 'language-routing',
    providers: ['javascript'],
    network: 'deny',
    estimatedResidentBytes: 8_192,
  },
  run(text: string) {
    return accepted(/\p{Script=Telugu}/u.test(text) ? 'te-IN' : 'en', {
      score: 0.98,
    });
  },
});

const result = await kernel.run<string, string>('language.route', input, {
  priority: 5,
  deadlineMs: 200,
});

await kernel.destroy();
```

Every valid registered run resolves to `accepted`, `abstained`, or `failed`.
Unknown IDs, a destroyed kernel, and invalid options are programmer errors and
throw synchronously. Results include capability/version/provider provenance and
queue, load, run, and total timing. Scores are capability evidence, not
automatically calibrated probabilities.

## Flows

```ts
import { defineFlow } from 'leanlet-ai';

const preflight = defineFlow<string, Decision>({
  id: 'content.preflight',
  version: '1.0.0',
  uses: ['content.secrets', 'content.links', 'decision.release'],
  async run(input, context) {
    const [secrets, links] = await Promise.all([
      context.run('content.secrets', input),
      context.run('content.links', input),
    ]);
    return context.run('decision.release', { secrets, links });
  },
});

const { result, trace } = await preflight.run(kernel, draft);
```

Flows can invoke only IDs declared in `uses`. Their trace records completion
order, status, and timing. It is not a durable workflow log.

## In-flight request coalescing

```ts
const result = await kernel.run('image.embedding', image, {
  coalesceKey: contentHash,
  signal,
});
```

Concurrent runs with the same Leanlet ID and application-provided key share one
queued or active computation. Each caller can cancel its own wait without
cancelling shared work. Results are not retained after the computation settles.
Use a content hash or immutable record revision—not an ambiguous mutable ID.

## Browser vision adapter

Model weights are not included in npm. Copy one pinned profile and its ONNX
Runtime assets into the application:

```bash
npx leanlet models list
npx leanlet models add mobilenet-v4-small --dir public/leanlet-assets
```

```ts
import { VisionLeanlet } from 'leanlet-ai';

const vision = new VisionLeanlet({
  model: 'mobileclip-s0-compact',
  categories: ['Electronics', 'Clothing', 'Home', 'Other'],
  assetBase: '/leanlet-assets/',
  threads: 1,
});

const result = await vision.classify(file, { signal });
console.log(result.category, result.score, result.elapsedMs);
vision.destroy();
```

MobileCLIP profiles support application-defined category text. MobileNetV4
profiles use a fixed ImageNet vocabulary and Leanlet's product mapping; they are
small but are not a general custom-taxonomy classifier. Cancellation stops
delivery and asks the worker to discard the request, but an active backend call
may finish first.

## Asset planning and evaluation

`planLeanletAssets()` deduplicates manifest assets, detects conflicting paths,
reports total/verified bytes, and optionally requires SHA-256 values.
`evaluateClassification()` reports coverage, overall and accepted accuracy,
macro F1, per-label precision/recall/F1, and p50/p95 latency.

## Lifecycle and policy notes

- `load` is lazy and loaded state is reused until disposal or idle eviction.
- Active runs are bounded globally by the kernel concurrency budget.
- Queued work is ordered by priority, then earliest deadline.
- Resident-memory admission uses declared estimates, not exact browser heap data.
- Cancellation and destruction rely on cooperative capability implementations.
- Network/provider policy checks manifest declarations; use CSP and origin
  controls for hard security boundaries.

Read the complete [guide](https://sukumarrekapalli.github.io/leanlet/docs/),
[API reference](https://sukumarrekapalli.github.io/leanlet/docs/api/),
[0.2 migration guide](https://sukumarrekapalli.github.io/leanlet/docs/migrate/),
and [source](https://github.com/sukumarrekapalli/leanlet).

## License

Leanlet framework code is Apache-2.0. Model weights retain their upstream
licenses and are not included in the npm package. Review `MODEL_LICENSES.md`
before distributing model assets.
