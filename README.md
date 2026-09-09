# Leanlet

[Documentation](https://sukumarrekapalli.github.io/leanlet/docs/) · [Live demos](https://sukumarrekapalli.github.io/leanlet/) · [npm package](https://www.npmjs.com/package/leanlet-ai)

Leanlet is an open-source library for bounded, task-specific intelligence in
web applications. Its `VisionLeanlet` runtime deploys models, a module worker,
and runtime assets with the application; image inference runs in the browser
without an inference API. `defineLeanlet` is a generic lifecycle wrapper for an
implementation supplied by the application.

The repository contains:

- the `leanlet-ai` TypeScript package in `packages/leanlet`;
- an interactive framework website and product-classification reference app;
- live examples for vision, routing, ranking, detection, retrieval, language,
  forecasting, and record matching;
- a complete documentation site under `/docs/`;
- a GitHub Pages deployment workflow.

The framework package is published on npm as `leanlet-ai`.

## Core API

```ts
import { VisionLeanlet } from 'leanlet-ai';

const classifier = new VisionLeanlet({
  model: 'mobileclip-s0',
  categories: ['Electronics', 'Clothing', 'Home & Furniture', 'Other'],
  assetBase: '/leanlet-assets/',
});

const result = await classifier.classify(file);
console.log(result.category, result.confidence);

classifier.destroy();
```

### Diagnostics

Pass `debug: true` to `VisionLeanlet` while integrating. Leanlet then writes
typed lifecycle events to the page console and model-load/inference diagnostics
to the `leanlet-vision` worker console. In Chromium DevTools, open **Sources →
Threads → leanlet-vision** to inspect the worker. Keep the option disabled in
normal production operation.

`defineLeanlet()` supplies lazy loading, running, and disposal for non-vision
capabilities such as embedded linear models, online rankers, statistical
detectors, and custom workers. It does not supply a model runtime or worker by
itself.

## Supported vision profiles

| Profile                 | Approximate model download | Category system       | Intended use                   |
| ----------------------- | -------------------------: | --------------------- | ------------------------------ |
| `mobileclip-s0`         |                      89 MB | Application-defined   | Full-precision vision profile  |
| `mobileclip-s0-fp16`    |                      66 MB | Application-defined   | Middle-sized vision profile    |
| `mobileclip-s0-compact` |                      55 MB | Application-defined   | Quantized vision profile       |
| `mobilenet-v4-medium`   |                      10 MB | Fixed ImageNet labels | Larger known-object classifier |
| `mobilenet-v4-small`    |                     3.9 MB | Fixed ImageNet labels | Small known-object classifier  |

Only the active profile is loaded by a `VisionLeanlet` worker. The asset CLI
installs one requested profile at a time, so applications must bundle every
profile they expose. Model assets are excluded from the npm package so
applications can control licensing, cache policy, provenance, and delivery.

## Architecture

```text
image input
      ↓
VisionLeanlet contract
      ↓
dedicated module worker
      ↓
Transformers.js → ONNX Runtime Web → WebAssembly
      ↓
ranked result + confidence + timing
```

Remote model loading is disabled in the vision worker. The application supplies
an explicit asset base. The worker owns model lifecycle and cached category
embeddings, and it is terminated when the Leanlet instance is destroyed.

## Development

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run check
npm test
npm run build
npm pack ./packages/leanlet --dry-run
```

The static site is generated in `dist/client`. The package is compiled to
`packages/leanlet/dist`.

## GitHub Pages

The project uses relative asset paths and includes
`.github/workflows/deploy-pages.yml`.

1. Push this directory to a GitHub repository with `main` as the default branch.
2. In **Settings → Pages**, select **GitHub Actions** as the source.
3. Push to `main` or run the workflow manually.

The workflow installs locked dependencies, builds the site, and publishes
`dist/client`. Model files and WebAssembly assets are served from the same
GitHub Pages origin.

## Production requirements

Before deploying a Leanlet capability:

- evaluate representative inputs and every target label;
- define quality and latency gates for supported device classes;
- implement an explicit low-confidence or unsupported-browser fallback;
- version model files and cache headers deliberately;
- publish model provenance, license, and intended-use notes;
- verify the Content Security Policy for module workers and local assets;
- use cross-origin isolation only when enabling multiple ONNX Runtime threads;
- test current Chrome, Edge, Firefox, and Safari releases, including mobile.

The live examples demonstrate the integration contract. They are not a
substitute for application-specific evaluation.

## Licensing

Framework code is Apache-2.0 licensed. Model files retain their upstream licenses.
See `MODEL_LICENSES.md` before redistributing model assets.
