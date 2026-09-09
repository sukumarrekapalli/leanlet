# leanlet-ai

Leanlet is browser-native infrastructure for bounded, task-specific
intelligence. `VisionLeanlet` runs supported image-classification profiles from
application-owned static assets in a module worker. `defineLeanlet` gives a
custom local implementation a small, lifecycle-aware contract.

Leanlet does not add telemetry or call an inference endpoint. Your application
still owns model assets, category design, confidence thresholds, user fallback,
and any analytics or server integration.

## Install

```bash
npm install leanlet-ai
npx leanlet models add mobileclip-s0 --dir public/leanlet-assets
```

The package does not include model weights. The asset command downloads one
pinned profile plus the required ONNX Runtime files into the directory you
choose. Run it for every profile your product exposes, then deploy that
directory with the application.

```text
public/leanlet-assets/
├── models/
│   └── Xenova/mobileclip_s0/
└── wasm/
```

Use `npx leanlet models list` to see supported profile IDs. Point `assetBase`
at the public directory containing both `models/` and `wasm/`.

## Product image classification

```ts
import { VisionLeanlet } from 'leanlet-ai';

const classifier = new VisionLeanlet({
  model: 'mobileclip-s0',
  categories: ['Electronics', 'Clothing', 'Home & Furniture', 'Other'],
  assetBase: '/leanlet-assets/',
});

const unsubscribe = classifier.subscribe((event) => {
  if (event.type === 'status') console.log(event.state, event.progress);
  if (event.type === 'error') console.error(event.message);
});

try {
  const result = await classifier.classify(file);
  console.log(result.category, result.confidence, result.elapsedMs);
} finally {
  unsubscribe();
  classifier.destroy();
}
```

`classify()` accepts an image `Blob` or `File` and returns:

## Diagnostics

Set `debug: true` while integrating to write structured lifecycle events to
the page console and model-load/classification diagnostics to the dedicated
worker console:

```ts
const classifier = new VisionLeanlet({
  assetBase: '/leanlet-assets/',
  debug: true,
});
```

In Chromium DevTools, open **Sources → Threads → leanlet-vision** to inspect
the worker. In the main Console, `classifier.subscribe()` receives the same
typed status, result, and error events. Disable `debug` in normal production
operation unless you are investigating an issue.

```ts
type CategoryResult = {
  category: string;
  confidence: number;
  predictions: Array<{ label: string; score: number }>;
  elapsedMs: number;
  modelId: LeanletModelId;
};
```

MobileCLIP profiles compare image content with the category strings provided by
your application. MobileNetV4 profiles have a fixed ImageNet vocabulary; use
them only where Leanlet's built-in object-to-product-category mapping fits your
evaluated inputs.

## Lifecycle and switching profiles

`warmup()` starts an asset load without classifying an image. `setModel(id)`
terminates the current worker, rejects any in-flight work, and creates a fresh
worker. Switch profiles between tasks, not during one. `destroy()` terminates
the worker and rejects pending work.

Profile file sizes exclude the shared ONNX Runtime files. Browser caches may
keep previously downloaded files according to your hosting headers.

## Define a custom leanlet

`defineLeanlet()` does not supply a model, worker, or transport. It lazily
loads and disposes a context that your application provides.

```ts
import { defineLeanlet } from 'leanlet-ai';

const anomaly = defineLeanlet<number[], { anomalous: boolean }>({
  id: 'sensor-anomaly-v1',
  infer(values) {
    return { anomalous: (values.at(-1) ?? 0) > 80 };
  },
});

const result = await anomaly.run([42, 44, 81]);
await anomaly.destroy();
```

## Deployment notes

- Serve model and WASM assets from the same application origin when possible.
- Serve `.wasm` with `Content-Type: application/wasm`.
- Use versioned asset directories to control cache invalidation.
- The default is one ONNX Runtime thread. Values above one require browser
  WebAssembly thread support and a cross-origin-isolated document.
- Evaluate category quality, memory, load time, and latency on representative
  inputs and target devices before production use.

See the [Leanlet documentation site](https://sukumarrekapalli.github.io/leanlet/docs/)
for profile details, API reference, browser guidance, and deployment notes.

## License

Leanlet framework code is Apache-2.0. Model weights retain their upstream
licenses and are not included in this npm package; review `MODEL_LICENSES.md`
before redistributing downloaded model assets.
