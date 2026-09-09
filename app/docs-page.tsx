'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ExternalLink,
  GitFork,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { NpmMark } from '@/components/npm-mark';

const sections = [
  ['overview', 'Overview'],
  ['installation', 'Installation'],
  ['quickstart', 'Quickstart'],
  ['assets', 'Model assets'],
  ['models', 'Model profiles'],
  ['categories', 'Category design'],
  ['api', 'API reference'],
  ['custom', 'Custom leanlets'],
  ['production', 'Production guide'],
  ['browser-support', 'Browser support'],
  ['open-source', 'Open source'],
] as const;

function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="logo-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.035em]">
        Leanlet
      </span>
    </span>
  );
}
function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="docs-code">
      <button
        type="button"
        onClick={() => void copy()}
        aria-label="Copy code to clipboard"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function Docs() {
  return (
    <main className="docs-root">
      <header className="site-header">
        <div className="shell flex h-16 items-center justify-between">
          <a href="../">
            <Logo />
          </a>
          <span className="docs-divider">Documentation</span>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-[#59667e] sm:flex">
            <a href="../#models">Models</a>
            <a href="#api">API</a>
            <a href="#production">Production</a>
          </nav>
          <a
            className="nav-install ml-5 hidden lg:inline-flex"
            href="https://www.npmjs.com/package/leanlet-ai"
            target="_blank"
            rel="noreferrer"
          >
            <NpmMark /> npm
          </a>
          <a className="nav-cta ml-2" href="../#demo">
            Live demo <ArrowRight className="size-3.5" />
          </a>
        </div>
      </header>
      <div className="docs-layout shell">
        <aside className="docs-sidebar">
          <a className="docs-back" href="../">
            <ArrowLeft /> Back to Leanlet
          </a>
          <p>Get started</p>
          {sections.slice(0, 4).map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
          <p>Guides</p>
          {sections.slice(4, 10).map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
          <p>Project</p>
          <a href="#open-source">Open source</a>
        </aside>
        <article className="docs-content">
          <section id="overview" className="docs-intro">
            <div className="docs-badge">v0.2 · Core package</div>
            <h1>Leanlet documentation</h1>
            <p>
              Leanlet is a browser-native library for bounded, task-specific
              intelligence. Its vision runtime loads a selected ONNX profile
              from application-owned assets, executes it in a module worker, and
              returns typed local results. Its generic contract lets an
              application give rules, statistical estimators, or other local
              implementations the same lifecycle shape.
            </p>
            <div className="docs-callout blue">
              <ShieldCheck />
              <div>
                <strong>Privacy is architectural</strong>
                <p>
                  VisionLeanlet sends image bytes only to its browser worker. It
                  does not call an inference endpoint or add telemetry. Your own
                  application, analytics, hosting, and fallback code remain
                  separate trust boundaries.
                </p>
              </div>
            </div>
          </section>

          <section id="installation">
            <p className="docs-kicker">Get started</p>
            <h2>Installation</h2>
            <p>
              Install the public package, then copy the exact model profile your
              feature will expose. The npm package does not include model
              weights and does not download them during application runtime.
            </p>
            <Code>{`npm install leanlet-ai
npx leanlet models add mobileclip-s0 --dir public/leanlet-assets`}</Code>
            <h3>Runtime requirements</h3>
            <ul>
              <li>A modern browser with WebAssembly and Web Worker support.</li>
              <li>
                Model and ONNX Runtime assets served from an application-owned
                public path.
              </li>
              <li>
                A bundler that supports ESM and{' '}
                <code>new URL(..., import.meta.url)</code>, including Vite,
                webpack 5, Parcel, and modern framework bundlers.
              </li>
              <li>
                A deployment process that copies every profile your UI allows a
                user to select; installing one profile does not install the
                others.
              </li>
            </ul>
          </section>

          <section id="quickstart">
            <p className="docs-kicker">First classifier</p>
            <h2>Quickstart</h2>
            <p>
              Create one classifier for the feature, provide the exact
              categories your product understands, and dispose it with the
              surrounding UI.
            </p>
            <Code>{`import { VisionLeanlet } from 'leanlet-ai';

const classifier = new VisionLeanlet({
  model: 'mobileclip-s0',
  categories: ['Electronics', 'Clothing', 'Home & Furniture', 'Other'],
  assetBase: '/leanlet-assets/',
});

classifier.subscribe((event) => {
  if (event.type === 'status') renderProgress(event);
  if (event.type === 'error') showClassifierError(event.message);
});

try {
  const result = await classifier.classify(imageFile);
  if (result.confidence >= 0.65) routeTo(result.category);
  else showCategoryPicker();
} finally {
  classifier.destroy();
}`}</Code>
            <div className="docs-callout">
              <Check />
              <div>
                <strong>Use the result as a signal</strong>
                <p>
                  A confidence score is not a guarantee. Define a measured
                  threshold and make the fallback part of the product
                  experience.
                </p>
              </div>
            </div>
          </section>

          <section id="assets">
            <p className="docs-kicker">Deployment</p>
            <h2>Model assets</h2>
            <p>
              The asset command downloads a pinned profile during development or
              CI, integrity-checks its model binaries, then places the model and
              matching ONNX Runtime files under a public directory. At browser
              runtime, Leanlet requests those static assets from{' '}
              <code>assetBase</code>; it does not request weights from a model
              inference service.
            </p>
            <Code>{`npx leanlet models add mobileclip-s0 --dir public/leanlet-assets

public/leanlet-assets/
├── models/
│   └── Xenova/mobileclip_s0/
│       ├── config.json
│       ├── preprocessor_config.json
│       ├── tokenizer.json
│       ├── tokenizer_config.json
│       └── onnx/
│           ├── text_model_quantized.onnx
│           └── vision_model.onnx
└── wasm/
    ├── ort-wasm-simd-threaded.wasm
    ├── ort-wasm-simd-threaded.mjs
    ├── ort-wasm-simd-threaded.jsep.wasm
    └── ort-wasm-simd-threaded.jsep.mjs`}</Code>
            <p>
              Serve <code>.wasm</code> as <code>application/wasm</code>. Use
              immutable caching for versioned model paths and keep configuration
              files on the same cache policy as their weights.
            </p>
            <div className="docs-callout">
              <Check />
              <div>
                <strong>Expose only installed profiles</strong>
                <p>
                  The command above installs one MobileCLIP profile. Run a
                  separate command for each additional selector option, then
                  deploy all of those assets together. Selecting a profile that
                  is absent from <code>assetBase</code> produces a load error.
                </p>
              </div>
            </div>
          </section>

          <section id="models">
            <p className="docs-kicker">Registry</p>
            <h2>Model profiles</h2>
            <div className="docs-table">
              <div>
                <b>Profile</b>
                <b>Download</b>
                <b>Best for</b>
              </div>
              <div>
                <span>
                  <strong>mobileclip-s0</strong>
                  <small>Recommended</small>
                </span>
                <span>~89 MB</span>
                <span>
                  Custom retail taxonomies; q8 text + fp32 vision for accuracy.
                </span>
              </div>
              <div>
                <span>
                  <strong>mobileclip-s0-compact</strong>
                  <small>Balanced</small>
                </span>
                <span>~55 MB</span>
                <span>
                  Custom labels on constrained devices; lower difficult-image
                  accuracy.
                </span>
              </div>
              <div>
                <span>
                  <strong>mobileclip-s0-fp16</strong>
                  <small>Balanced</small>
                </span>
                <span>~66 MB</span>
                <span>
                  Custom labels with an FP16 vision encoder; validate support
                  and quality on target browsers.
                </span>
              </div>
              <div>
                <span>
                  <strong>mobilenet-v4-medium</strong>
                  <small>Fixed vocabulary</small>
                </span>
                <span>~10 MB</span>
                <span>
                  Known ImageNet objects when the Small profile is insufficient.
                </span>
              </div>
              <div>
                <span>
                  <strong>mobilenet-v4-small</strong>
                  <small>Specialized</small>
                </span>
                <span>3.9 MB</span>
                <span>
                  Known ImageNet objects where fixed vocabulary is acceptable.
                </span>
              </div>
            </div>
            <p>
              Only the active profile is loaded into a{' '}
              <code>VisionLeanlet</code> worker. Profile sizes are rounded
              weight totals and exclude shared runtime files. Switching models
              creates a fresh worker and releases the previous runtime. The
              browser cache may retain downloaded files according to your
              hosting headers.
            </p>
            <p>
              MobileCLIP profiles compare an image against the category strings
              supplied to <code>classify()</code>. MobileNet profiles do not:
              they classify against their fixed ImageNet vocabulary, then
              Leanlet maps known object labels to its bundled product-category
              aliases. Use MobileNet only when that fixed vocabulary is an
              acceptable fit and validate its mapped results on real inputs.
            </p>
            <Code>{`classifier.setModel('mobileclip-s0-compact');
await classifier.classify(file);`}</Code>
          </section>

          <section id="categories">
            <p className="docs-kicker">Quality</p>
            <h2>Designing categories</h2>
            <p>
              Category design applies to the MobileCLIP zero-shot profiles. They
              are strongest when labels are mutually distinct and grounded in
              visible characteristics. Begin with a small top-level taxonomy,
              then route ambiguous inputs to a user choice or a second
              specialized model.
            </p>
            <ul>
              <li>Use 2–20 categories per decision when possible.</li>
              <li>
                Avoid overlapping choices such as “electronics,” “phones,” and
                “mobile accessories” in one pass.
              </li>
              <li>
                Include an explicit fallback category, but do not accept it
                automatically at low confidence.
              </li>
              <li>
                Evaluate cropping, packaging, multiple subjects, poor lighting,
                and backgrounds from the real application.
              </li>
            </ul>
            <p>
              The runtime keeps between 2 and 50 non-empty unique labels. If a
              supplied list does not meet that minimum, it falls back to the
              instance category set. Keep labels stable enough for your UI, but
              use descriptive prompts in your own evaluation notes so changes
              can be compared deliberately.
            </p>
            <h3>Evaluation strategy</h3>
            <p>
              For application-defined labels, compare the MobileCLIP profiles on
              a representative labeled set. Measure per-category precision,
              recall, loading cost, memory, and latency. A fixed-vocabulary or
              domain-trained compact model may be preferable when its labels and
              measured behavior fit the task.
            </p>
          </section>

          <section id="api">
            <p className="docs-kicker">Reference</p>
            <h2>API reference</h2>
            <h3>
              <code>new VisionLeanlet(options)</code>
            </h3>
            <div className="api-list">
              <div>
                <code>model</code>
                <span>
                  <b>LeanletModelId</b> · default <code>mobileclip-s0</code>
                </span>
              </div>
              <div>
                <code>categories</code>
                <span>
                  <b>readonly string[]</b> · 2–50 candidate labels
                </span>
              </div>
              <div>
                <code>assetBase</code>
                <span>
                  <b>string</b> · defaults to the current document base
                </span>
              </div>
              <div>
                <code>threads</code>
                <span>
                  <b>number</b> · clamped to 1–4; default 1
                </span>
              </div>
              <div>
                <code>workerUrl</code>
                <span>
                  <b>URL</b> · optional custom worker entry
                </span>
              </div>
              <div>
                <code>debug</code>
                <span>
                  <b>boolean</b> · optional DevTools diagnostics; default false
                </span>
              </div>
            </div>
            <p>
              <code>assetBase</code> must include the directory that contains
              both <code>models/</code> and <code>wasm/</code>. It defaults to
              the current document directory, so applications deployed below a
              nested route will usually set it explicitly.
            </p>
            <p>
              Set <code>debug: true</code> while integrating to write structured
              lifecycle events to the page console and runtime diagnostics to
              the dedicated worker console. Disable it in normal production
              operation unless diagnostic logging is required.
            </p>
            <Code>{`const classifier = new VisionLeanlet({
  assetBase: '/leanlet-assets/',
  debug: true,
});

// Main-page DevTools Console: status, result, and error events.
// Sources → Threads → leanlet-vision: worker-level load and inference diagnostics.`}</Code>
            <h3>
              <code>classify(file, options?)</code>
            </h3>
            <p>
              Accepts an image <code>Blob</code> or <code>File</code> and
              resolves to a ranked result.
            </p>
            <Code>{`type CategoryResult = {
  category: string;
  confidence: number;
  predictions: Array<{ label: string; score: number }>;
  elapsedMs: number;
  modelId: LeanletModelId;
};`}</Code>
            <h3>
              <code>subscribe(listener)</code>
            </h3>
            <p>
              Receives status, result, and error events and returns an
              unsubscribe function. Status states are <code>loading</code>,{' '}
              <code>ready</code>, and <code>running</code>; errors use a
              separate event and may include the request ID.
            </p>
            <Code>{`const unsubscribe = classifier.subscribe((event) => {
  if (event.type === 'status') {
    console.log(event.state, event.progress, event.modelId);
  } else if (event.type === 'result') {
    console.log(event.result.category, event.result.elapsedMs);
  } else {
    console.error(event.message, event.requestId);
  }
});

unsubscribe();`}</Code>
            <h3>
              <code>warmup()</code> · <code>setModel(id)</code> ·{' '}
              <code>destroy()</code>
            </h3>
            <p>
              <code>warmup()</code> begins a local load without classification.
              <code>setModel()</code> terminates the current worker, rejects any
              in-flight classifications, and starts a new worker for the next
              task. Call it only between tasks. Always destroy the instance when
              its owner is removed.
            </p>
          </section>

          <section id="custom">
            <p className="docs-kicker">Generic lifecycle</p>
            <h2>Define a custom leanlet</h2>
            <p>
              <code>defineLeanlet()</code> does not supply a model registry,
              worker, or inference engine. It wraps an implementation your
              application provides with a lazy <code>load</code>,{' '}
              <code>run</code>, and <code>destroy</code> lifecycle. This is a
              useful fit for a small deterministic rule, local estimator, or a
              separately managed model runtime.
            </p>
            <Code>{`import { defineLeanlet } from 'leanlet-ai';

const temperatureGate = defineLeanlet<number[], { anomalous: boolean }>({
  id: 'temperature-gate-v1',
  infer(values) {
    const latest = values.at(-1) ?? 0;
    return { anomalous: latest > 80 };
  },
});

await temperatureGate.warmup();
const result = await temperatureGate.run([42, 44, 81]);
await temperatureGate.destroy();`}</Code>
            <div className="docs-callout blue">
              <ShieldCheck />
              <div>
                <strong>Bring the execution boundary</strong>
                <p>
                  If a custom leanlet loads an ONNX session, starts a worker, or
                  contacts a service, that behavior belongs to the supplied
                  implementation. Document its transport, memory, model
                  provenance, and fallback separately.
                </p>
              </div>
            </div>
          </section>

          <section id="production">
            <p className="docs-kicker">Operations</p>
            <h2>Production guide</h2>
            <div className="checklist">
              {[
                'Build an evaluation set from representative inputs.',
                'Set category-specific quality and confidence thresholds.',
                'Provide a visible correction or deterministic fallback.',
                'Bundle every profile exposed by your product UI.',
                'Version model paths and invalidate caches deliberately.',
                'Track latency and outcomes only with explicit application telemetry outside Leanlet.',
                'Test low-memory mobile devices and browser tab suspension.',
                'Publish model provenance, license, and intended-use notes.',
                'Keep Content Security Policy, worker, and asset-fetch rules explicit.',
              ].map((item) => (
                <div key={item}>
                  <Check />
                  {item}
                </div>
              ))}
            </div>
            <div className="docs-callout amber">
              <ShieldCheck />
              <div>
                <strong>Evaluation is part of deployment</strong>
                <p>
                  Demo results establish that the integration works; they do not
                  establish fitness for a production dataset. Define release
                  gates with representative labeled examples and re-run them for
                  every model or taxonomy version.
                </p>
              </div>
            </div>
            <h3>Static-asset deployment</h3>
            <p>
              Publish model configuration, tokenizer files, ONNX files, and
              runtime files as one compatible release. Prefer versioned asset
              paths such as <code>/leanlet-assets/v1/</code>; after a model or
              runtime change, point the application at a new path rather than
              relying on users to clear a cache. Serve WebAssembly with
              <code>application/wasm</code>.
            </p>
            <h3>Failure handling</h3>
            <p>
              Treat a worker error, unsupported browser capability, missing
              asset, and low-confidence result as separate product states. The
              package reports load and inference errors; the application owns
              retry policy, user messaging, and any deterministic fallback.
            </p>
          </section>

          <section id="browser-support">
            <p className="docs-kicker">Compatibility</p>
            <h2>Browser support</h2>
            <p>
              The default execution provider is WebAssembly because it has the
              broadest reach. Inference runs in a dedicated module worker. Test
              the current and previous major release of Chrome, Edge, Firefox,
              and Safari, plus the oldest mobile devices in your support policy.
            </p>
            <h3>Threads and isolation</h3>
            <p>
              Leanlet defaults to one ONNX Runtime thread. Values from 2 to 4
              are accepted, but browser multithreading requires both WebAssembly
              thread support and a cross-origin-isolated document. Keep the
              default unless you have measured an improvement on your target
              devices.
            </p>
            <Code>{`Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp`}</Code>
            <p>
              Those headers are one common route to cross-origin isolation. If
              the page embeds third-party resources, verify that they satisfy
              the chosen COEP policy before enabling it. A restrictive Content
              Security Policy also needs to permit the application worker and
              same-origin model and WASM fetches.
            </p>
            <p>
              “Browser-only” does not mean zero cost: model files consume
              network, cache, and memory. The registry makes those costs
              explicit so applications can choose a profile or fall back before
              loading.
            </p>
          </section>

          <section id="open-source">
            <p className="docs-kicker">Project</p>
            <h2>Open source</h2>
            <p>
              Leanlet’s framework code is Apache-2.0 licensed. Model weights
              retain their upstream licenses and notices. Review{' '}
              <code>MODEL_LICENSES.md</code> before redistributing model assets.
            </p>
            <div className="docs-links">
              <a
                href="https://www.npmjs.com/package/leanlet-ai"
                target="_blank"
                rel="noreferrer"
              >
                <NpmMark /> leanlet-ai on npm
              </a>
              <a href="../">
                <ArrowLeft /> Project home
              </a>
              <a href="../#demo">
                <ExternalLink /> Live browser demo
              </a>
              <a href="../#models">
                <Package /> Model registry
              </a>
              <a
                href="https://github.com/sukumarrekapalli/leanlet"
                target="_blank"
                rel="noreferrer"
              >
                <GitFork /> Source on GitHub
              </a>
            </div>
          </section>

          <div className="docs-next">
            <span>Next</span>
            <a href="#installation">
              Install Leanlet <ChevronRight />
            </a>
          </div>
        </article>
        <aside className="docs-toc">
          <p>On this page</p>
          {sections.slice(0, -1).map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
        </aside>
      </div>
    </main>
  );
}
