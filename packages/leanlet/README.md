# leanlet-ai

**Scoped intelligence for browser applications.**

For kernel and flow use without the optional vision runtime, import the focused browser entry:

```ts
import { accepted, createLeanletKernel, defineFlow } from 'leanlet-ai/kernel';
```

This entry prevents applications that do not use `VisionLeanlet` from emitting vision worker and ONNX runtime assets.

[Website](https://sukumarrekapalli.github.io/leanlet/) ·
[Guide](https://sukumarrekapalli.github.io/leanlet/docs/) ·
[API reference](https://sukumarrekapalli.github.io/leanlet/docs/api/) ·
[SafeShare reference app](https://sukumarrekapalli.github.io/leanlet/studio/) ·
[Source](https://github.com/sukumarrekapalli/leanlet)

Leanlet is a TypeScript framework for placing small, task-specific capabilities
inside web applications. A Leanlet can wrap a compact model, Web Worker, WASM
module, local index, statistical method, or deterministic rule. Applications
can run one capability directly or coordinate several through a shared kernel
with explicit scheduling, lifecycle, policy, budgets, results, and provenance.

Leanlet itself adds no inference endpoint or telemetry. Inputs can remain in
the browser when the selected capability and all of its assets are local.
Custom capability code still has the browser privileges of its host
application; framework policy is admission control, not a JavaScript sandbox.

> This README describes the `0.3` beta API. The stable `0.2` line remains
> available under npm tag `latest`; the managed kernel and flow APIs are under
> tag `next`. See the [migration guide](https://sukumarrekapalli.github.io/leanlet/docs/migrate/).

## Contents

- [Install](#install)
- [Choose an API](#choose-an-api)
- [Run one Leanlet](#run-one-leanlet)
- [Coordinate several Leanlets](#coordinate-several-leanlets)
- [Compose a flow](#compose-a-flow)
- [Handle results](#handle-results)
- [Use browser vision](#use-browser-vision)
- [Framework surface](#framework-surface)
- [Performance and lifecycle](#performance-and-lifecycle)
- [Documentation](#documentation)
- [Compatibility and limits](#compatibility-and-limits)

## Install

Choose the release line deliberately:

```bash
# Stable single-capability and vision APIs
npm install leanlet-ai

# 0.3 beta: adds the kernel, flows, asset planning, and evaluation
npm install leanlet-ai@next --save-exact
```

Kernel-only applications need no model-runtime package. Applications using the
built-in vision adapter must install its optional peer explicitly:

```bash
npm install leanlet-ai@next @huggingface/transformers
```

The package is ESM and framework-agnostic. It can be called from React,
Angular, Vue, Svelte, or plain TypeScript. Model weights are not bundled.

## Choose an API

| Need                                                    | Use                        |
| ------------------------------------------------------- | -------------------------- |
| One lazy capability                                     | `defineLeanlet()`          |
| Shared scheduling, lifecycle, policy, or budgets        | `LeanletKernel`            |
| Explicit composition of several registered capabilities | `defineFlow()`             |
| Supported image classification profiles                 | `VisionLeanlet`            |
| Release-time asset metadata and integrity checks        | `planLeanletAssets()`      |
| Classification quality and latency metrics              | `evaluateClassification()` |

Start with `defineLeanlet()` when a global runtime would add no value. Move to
the kernel without changing the application-level purpose of that capability
when coordination becomes necessary.

## Run one Leanlet

The minimal API has no hidden global kernel, queue, worker, or network behavior:

```ts
import { defineLeanlet } from 'leanlet-ai';

const languageRoute = defineLeanlet<string, 'te' | 'en'>({
  id: 'language.route',
  infer(text) {
    return /\p{Script=Telugu}/u.test(text) ? 'te' : 'en';
  },
});

const route = await languageRoute.run(message);
await languageRoute.destroy();
```

For reusable state, supply `load` and `dispose`. Loading remains lazy unless
`warmup()` is called:

```ts
type Index = {
  search(query: string): string[];
  close(): void;
};

const search = defineLeanlet<string, string[], Index>({
  id: 'docs.search',
  load: () => createApplicationIndex(), // supplied by the application
  infer: (query, index) => index.search(query),
  dispose: (index) => index.close(),
});

await search.warmup();
const matches = await search.run('reset password');
await search.destroy();
```

## Coordinate several Leanlets

Use `leanlet-ai@next` for the managed runtime:

```ts
import { accepted, createLeanletKernel } from 'leanlet-ai';

const kernel = createLeanletKernel({
  budget: {
    maxConcurrentRuns: 2,
    maxResidentBytes: 96 * 1024 * 1024,
    defaultDeadlineMs: 2_000,
  },
  policy: {
    network: 'deny',
    allowedProviders: ['javascript', 'wasm-single'],
  },
});

kernel.register({
  manifest: {
    id: 'content.language',
    version: '1.0.0',
    task: 'language-routing',
    providers: ['javascript'],
    network: 'deny',
    estimatedResidentBytes: 2_048,
  },
  run(text: string) {
    return accepted(/\p{Script=Telugu}/u.test(text) ? 'te' : 'en');
  },
});

const result = await kernel.run<string, 'te' | 'en'>(
  'content.language',
  message,
  { priority: 5, deadlineMs: 200 },
);
```

Registration validates manifest and policy compatibility. Valid registered
runs resolve to a structured result. Unknown IDs, a destroyed kernel, and
invalid run options are programmer errors and throw.

## Compose a flow

Flows declare which registered Leanlets they may invoke:

```ts
import { accepted, defineFlow } from 'leanlet-ai';

const preflight = defineFlow<string, { language: string; long: boolean }>({
  id: 'content.preflight',
  version: '1.0.0',
  uses: ['content.language'],
  async run(text, context) {
    const language = await context.run<string, string>(
      'content.language',
      text,
    );

    if (language.status !== 'accepted') return language;
    return accepted({
      language: language.output,
      long: text.length > 500,
    });
  },
});

const navigationSignal = new AbortController().signal;
const { result, trace } = await preflight.run(kernel, draft, {
  deadlineMs: 1_000,
  signal: navigationSignal,
});

await kernel.destroy();
```

The trace records in-memory completion order, status, and timing. It is not a
durable workflow log. The application owns thresholds, fallback, persistence,
consent, and user-visible consequences.

## Handle results

Every managed result is `accepted`, `abstained`, or `failed`:

```ts
if (result.status === 'accepted') {
  use(result.output, result.score, result.timing, result.provenance);
} else if (result.status === 'abstained') {
  fallback(result.reason, result.candidates);
} else {
  report(result.error.code, result.recoverable);
}
```

A `score` is capability-defined evidence, not automatically a probability. Use
`calibratedConfidence` only when a documented calibration procedure supports
that interpretation.

## Use browser vision

Install only the evaluated profile into the application's static assets:

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

| Profile                 | Approximate model download | Category behavior                                 |
| ----------------------- | -------------------------: | ------------------------------------------------- |
| `mobilenet-v4-small`    |                     3.9 MB | Fixed ImageNet vocabulary; smallest baseline      |
| `mobilenet-v4-medium`   |                      10 MB | Larger fixed-vocabulary baseline                  |
| `mobileclip-s0-compact` |                      55 MB | Quantized, application-defined category text      |
| `mobileclip-s0-fp16`    |                      66 MB | FP16, application-defined category text           |
| `mobileclip-s0`         |                      89 MB | Full precision, application-defined category text |

Model sizes exclude the shared ONNX Runtime payload. MobileNet profiles are
known-object classifiers, not general arbitrary-taxonomy classifiers. Test the
exact model, labels, inputs, browsers, and target devices before release.

## Framework surface

| Area               | Main exports                                                      |
| ------------------ | ----------------------------------------------------------------- |
| Minimal lifecycle  | `defineLeanlet`, `LeanletDefinition`, `ScopedLeanlet`             |
| Managed runtime    | `createLeanletKernel`, `LeanletKernel`, `KernelLeanletDefinition` |
| Results            | `accepted`, `abstained`, `LeanletResult`, `LeanletError`          |
| Composition        | `defineFlow`, `LeanletFlow`, `LeanletFlowTrace`                   |
| Policy and budgets | `LeanletManifest`, `LeanletKernelPolicy`, `LeanletKernelBudget`   |
| Runtime inspection | `LeanletKernelEvent`, `LeanletKernelSnapshot`                     |
| Release evidence   | `planLeanletAssets`, `evaluateClassification`                     |
| Browser vision     | `VisionLeanlet`, `LEANLET_MODELS`, `LeanletModelId`               |

The [complete API reference](https://sukumarrekapalli.github.io/leanlet/docs/api/)
documents every public export, signature, option, default, result field, event,
and error.

## Performance and lifecycle

The kernel supports lazy loading, runtime reuse, bounded concurrency, priority
and earliest-deadline ordering, declared-memory admission, least-recently-used
idle eviction under pressure, and in-flight request coalescing:

```ts
const result = await kernel.run('image.embedding', image, {
  coalesceKey: contentHash,
  signal,
});
```

Concurrent requests with the same Leanlet ID and exact application key share
one queued or active computation. Each caller may cancel its own wait without
cancelling work needed by others. Results are not retained after settlement.

## Documentation

| Resource                                                                                             | Contents                                                              |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Learning guide](https://sukumarrekapalli.github.io/leanlet/docs/)                                   | Concepts, API selection, tutorials, deployment, and release checklist |
| [API reference](https://sukumarrekapalli.github.io/leanlet/docs/api/)                                | Complete public contract and defaults                                 |
| [Migration guide](https://sukumarrekapalli.github.io/leanlet/docs/migrate/)                          | `0.2` compatibility, upgrade, rollout, and rollback                   |
| [SafeShare](https://sukumarrekapalli.github.io/leanlet/studio/)                                      | Working multi-Leanlet browser reference application                   |
| [Architecture](https://github.com/sukumarrekapalli/leanlet/blob/main/docs/ARCHITECTURE.md)           | Ownership, execution, scheduling, lifecycle, and security boundaries  |
| [Adapter authoring](https://github.com/sukumarrekapalli/leanlet/blob/main/docs/ADAPTERS.md)          | Contract for models, workers, WASM, indexes, and algorithms           |
| [Performance](https://github.com/sukumarrekapalli/leanlet/blob/main/docs/PERFORMANCE.md)             | Measurement, budgets, coalescing, and benchmark interpretation        |
| [Release notes](https://github.com/sukumarrekapalli/leanlet/blob/main/docs/releases/0.3.0-beta.1.md) | Beta changes and known constraints                                    |
| [Next release](https://github.com/sukumarrekapalli/leanlet/blob/main/docs/NEXT_RELEASE.md)           | Engineering priorities and stable promotion gates                     |

## Compatibility and limits

- Core imports require ESM. The vision adapter requires modern browser support
  for module workers, WebAssembly, AbortController, and related APIs.
- Model/configuration/WASM assets must be served from `assetBase`.
- Network/provider policy checks declarations; use CSP, origin boundaries,
  dependency review, and browser permissions for hard security controls.
- Declared resident bytes guide admission and eviction; they are not exact
  browser heap or accelerator-memory measurements.
- Running cancellation is cooperative. A native WASM or GPU operation may
  finish before observing an aborted signal.
- Flows are in-page orchestration, not durable jobs, distributed consensus, or
  cross-tab scheduling.
- Leanlet does not make a model accurate, fair, calibrated, or suitable for a
  product decision. Release gates require representative evaluation data.

## License

Leanlet framework code is Apache-2.0. Model assets retain their upstream
licenses and are not included in this package. Review
[`MODEL_LICENSES.md`](https://github.com/sukumarrekapalli/leanlet/blob/main/MODEL_LICENSES.md)
before distributing a model profile.
