# Leanlet

[Documentation](https://sukumarrekapalli.github.io/leanlet/docs/) · [API reference](https://sukumarrekapalli.github.io/leanlet/docs/api/) · [SafeShare reference app](https://sukumarrekapalli.github.io/leanlet/studio/) · [Live demos](https://sukumarrekapalli.github.io/leanlet/) · [npm package](https://www.npmjs.com/package/leanlet-ai)

Leanlet is an open-source TypeScript framework for coordinating bounded,
task-specific intelligence inside web applications. A Leanlet can wrap a compact
model, worker, local index, statistical method, or deterministic rule. The
kernel schedules them under shared concurrency, deadline, provider, network,
and declared-memory policies; flows combine their typed evidence into an
application-owned decision.

The repository contains:

- the `leanlet-ai` TypeScript package in `packages/leanlet`;
- an interactive framework website and SafeShare reference application;
- live examples for vision, routing, ranking, detection, retrieval, language,
  forecasting, and record matching;
- a complete documentation site under `/docs/`;
- a GitHub Pages deployment workflow.

The framework package is published on npm as `leanlet-ai`.

## Start with one Leanlet

```ts
import { defineLeanlet } from 'leanlet-ai';

const languageRoute = defineLeanlet<string, 'te' | 'en'>({
  id: 'language.route',
  infer: (text) => (/\p{Script=Telugu}/u.test(text) ? 'te' : 'en'),
});

const route = await languageRoute.run(message);
await languageRoute.destroy();
```

`defineLeanlet` is the minimal load → run → dispose API. It does not require a
kernel. Add managed execution when several capabilities need shared scheduling,
policy, lifecycle, provenance, or budgets.

## Managed kernel API

```ts
import { accepted, createLeanletKernel, defineFlow } from 'leanlet-ai';

const kernel = createLeanletKernel({
  budget: { maxConcurrentRuns: 2, maxResidentBytes: 128_000_000 },
  policy: { network: 'deny', allowedProviders: ['javascript'] },
});

kernel.register({
  manifest: {
    id: 'language.route',
    version: '1.0.0',
    task: 'language-routing',
    providers: ['javascript'],
    network: 'deny',
  },
  run(text: string) {
    return accepted(/\p{Script=Telugu}/u.test(text) ? 'te-IN' : 'en');
  },
});

const result = await kernel.run('language.route', input, {
  deadlineMs: 100,
  priority: 5,
});
```

See [Architecture](docs/ARCHITECTURE.md), [Adapter authoring](docs/ADAPTERS.md),
[API reference](docs/API.md), [0.3 migration](docs/MIGRATION_0.3.md),
[0.3 beta release notes](docs/releases/0.3.0-beta.1.md),
[next-release working plan](docs/NEXT_RELEASE.md), [Performance](docs/PERFORMANCE.md), and the
[web documentation](https://sukumarrekapalli.github.io/leanlet/docs/).

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

## Reference application

```text
content draft
      ↓
LeanletKernel resource and policy boundary
      ↓
secrets ─ personal data ─ links ─ language ─ tone ─ readability
      ↓
typed findings → deterministic redaction → release policy
```

SafeShare runs this complete flow in the browser and exposes its actual runtime
graph, findings, timings, sanitized draft, and release decision. Its inspectable
patterns demonstrate composition; they are not a complete DLP or security
control.

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
- implement an explicit low-score, abstention, and unsupported-browser fallback;
- version model files and cache headers deliberately;
- publish model provenance, license, and intended-use notes;
- verify the Content Security Policy for module workers and local assets;
- use cross-origin isolation only when enabling multiple ONNX Runtime threads;
- test current Chrome, Edge, Firefox, and Safari releases, including mobile.

The reference application demonstrates composition and runtime behavior. It is
not evidence that its sample models or thresholds fit another production domain.

## Licensing

Framework code is Apache-2.0 licensed. Model files retain their upstream licenses.
See `MODEL_LICENSES.md` before redistributing model assets.
