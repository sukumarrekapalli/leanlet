# Leanlet

**Ship less AI. Build smarter.**

Leanlet is an open-source experiment and starter framework for **intrinsically
intelligent web applications**: small, task-specific models shipped as part of
the website and executed on the user's device.

The included demo classifies a product photo with a quantized MobileNetV4 model.
The image never leaves the browser. There is no inference API, cloud model,
Ollama process, account, or API key.

## The idea

AI should earn its place in software. Start with a narrow decision, choose the
smallest model that meets a measured quality bar, isolate it behind a simple
contract, and keep a deterministic fallback. Do not force AI onto every screen.

Leanlet calls each embedded capability a **leanlet**. A leanlet has:

1. a bounded input and output contract;
2. a small, versioned model stored with the application;
3. an off-main-thread runtime such as WebAssembly or WebGPU;
4. confidence and performance signals;
5. an explicit fallback when the model is uncertain or unsupported.

## What this demo proves

- A real INT8 vision model is bundled under `public/models/`.
- Remote model loading is disabled in `workers/vision.worker.ts`.
- ONNX Runtime Web executes the model through WebAssembly.
- A Web Worker keeps inference off the UI thread.
- Relative asset URLs allow deployment at a domain root or GitHub Pages subpath.
- The first load is cached by the browser; subsequent classifications reuse the
  same local runtime and weights.

The model weights are **3.9 MB**. The WebAssembly runtime is a separate, larger
one-time browser asset. Exact memory use and latency vary by browser and device.
Leanlet targets modern browsers with WebAssembly support; “browser-only” does
not mean every historical browser or every low-memory device is guaranteed.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the URL printed by Vite, choose a product image, and select **Classify on
this device**. In browser developer tools, the Network panel will show the model
coming from the same site. No classification request is sent after the assets
load.

## Build

```bash
npm run build
npm run preview
```

`dist/` is a fully static site. It can be uploaded to any static host.

## Publish with GitHub Pages

1. Create a repository and copy this folder into its root.
2. Push the repository with `main` as the default branch.
3. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
4. The included `.github/workflows/deploy-pages.yml` builds and publishes `dist/`.

The Vite configuration uses relative paths, so project pages such as
`https://username.github.io/leanlet/` work without editing a base URL.

## Framework anatomy

```text
user input
   ↓
VisionLeanlet (typed browser adapter)
   ↓
Web Worker (lifecycle + isolation)
   ↓
Transformers.js → ONNX Runtime Web → WebAssembly
   ↓
model output → taxonomy adapter → useful product result
```

Key files:

- `lib/vision-leanlet.ts` — reusable application-facing contract
- `lib/leanlet-types.ts` — typed status and result events
- `workers/vision.worker.ts` — model lifecycle, inference, and taxonomy adapter
- `public/models/` — model configuration and quantized weights
- `public/wasm/` — local inference runtime
- `app/page.tsx` — demo and project website

## Build another leanlet

1. Define one observable task and an accuracy/latency budget.
2. Select or train the smallest compatible model.
3. Convert and quantize it to ONNX (or another browser runtime format).
4. Place versioned weights in `public/models/<your-model>/`.
5. Add a dedicated worker with remote loading disabled.
6. Expose a typed adapter like `VisionLeanlet`.
7. Add confidence thresholds, a fallback, and representative evaluation cases.

Good candidates include intent detection, language detection, visual sorting,
small-vocabulary audio commands, local ranking, and sensitive-data detection.
Open-ended conversation and complex reasoning usually need a larger model and
are intentionally outside this starter's first scope.

## Accuracy note

The demo model recognizes ImageNet objects. A lightweight taxonomy adapter maps
those predictions to broad product categories. This is useful as a technology
demonstration, not yet a production FIMYD classifier. A production version
should be fine-tuned and evaluated on real catalog images and the exact target
taxonomy.

## Licenses

Project code is MIT licensed. Model and runtime notices are in
`MODEL_LICENSES.md`.

