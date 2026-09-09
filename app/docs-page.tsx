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

const sections = [
  ['overview', 'Overview'],
  ['installation', 'Installation'],
  ['quickstart', 'Quickstart'],
  ['assets', 'Hosting model assets'],
  ['models', 'Model profiles'],
  ['categories', 'Category design'],
  ['api', 'API reference'],
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
function NpmMark() {
  return (
    <svg className="npm-mark" aria-hidden="true" viewBox="0 0 64 24">
      <rect width="64" height="24" rx="2" fill="#cb3837" />
      <text
        x="32"
        y="17"
        fill="white"
        fontFamily="Arial, sans-serif"
        fontSize="15"
        fontWeight="700"
        textAnchor="middle"
      >
        npm
      </text>
    </svg>
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
            href="https://www.npmjs.com/package/@sukumar09/leanlet"
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
          {sections.slice(4, 9).map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
          <p>Project</p>
          <a href="#open-source">Open source</a>
        </aside>
        <article className="docs-content">
          <section id="overview" className="docs-intro">
            <div className="docs-badge">v0.1 · Core package</div>
            <h1>Leanlet documentation</h1>
            <p>
              Leanlet is a browser-native framework for shipping small,
              task-specific machine-learning models as part of a web
              application. It provides model selection, off-main-thread
              execution, local asset loading, lifecycle events, and typed
              results without requiring an inference API.
            </p>
            <div className="docs-callout blue">
              <ShieldCheck />
              <div>
                <strong>Privacy is architectural</strong>
                <p>
                  Once model assets are loaded, classification happens inside
                  the user’s browser. Images are not uploaded by Leanlet, and
                  the core package contains no telemetry.
                </p>
              </div>
            </div>
          </section>

          <section id="installation">
            <p className="docs-kicker">Get started</p>
            <h2>Installation</h2>
            <p>
              Install the public package from npm, then add only the model
              assets required by the feature.
            </p>
            <Code>{`npm install @sukumar09/leanlet
npx leanlet models add mobileclip-s0 --dir public/leanlet-assets`}</Code>
            <h3>Runtime requirements</h3>
            <ul>
              <li>A modern browser with WebAssembly and Web Worker support.</li>
              <li>
                Model and ONNX Runtime assets hosted with the application.
              </li>
              <li>
                A bundler that supports ESM and{' '}
                <code>new URL(..., import.meta.url)</code>, including Vite,
                webpack 5, Parcel, and modern framework bundlers.
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
            <Code>{`import { VisionLeanlet } from '@sukumar09/leanlet';

const classifier = new VisionLeanlet({
  model: 'mobileclip-s0',
  categories: ['Electronics', 'Clothing', 'Home & Furniture', 'Other'],
  assetBase: '/leanlet-assets/',
});

classifier.subscribe((event) => {
  if (event.type === 'status') renderProgress(event);
});

const result = await classifier.classify(imageFile);
if (result.confidence >= 0.65) routeTo(result.category);
else showCategoryPicker();

classifier.destroy();`}</Code>
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
              Leanlet never fetches weights from a runtime model service. The
              asset command installs an approved model profile and matching ONNX
              Runtime files into the application, then <code>assetBase</code>{' '}
              points to that public directory.
            </p>
            <Code>{`npx leanlet models add mobileclip-s0 --dir public/leanlet-assets

public/leanlet-assets/
├── models/
│   ├── Xenova/mobileclip_s0/
│   └── onnx-community/mobilenetv4_conv_small.e2400_r224_in1k/
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
                  <small>Compact</small>
                </span>
                <span>~55 MB</span>
                <span>
                  Custom labels on constrained devices; lower difficult-image
                  accuracy.
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
              Only the selected profile is loaded. Switching models creates a
              fresh worker and releases the previous runtime. The browser cache
              may retain downloaded files according to your hosting headers.
            </p>
            <Code>{`classifier.setModel('mobileclip-s0-compact');
await classifier.classify(file);`}</Code>
          </section>

          <section id="categories">
            <p className="docs-kicker">Quality</p>
            <h2>Designing categories</h2>
            <p>
              Zero-shot classification is strongest when categories are mutually
              distinct and grounded in visible characteristics. Begin with a
              small top-level taxonomy, then route ambiguous inputs to a user
              choice or a second specialized model.
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
            <h3>Evaluation strategy</h3>
            <p>
              Start with the accurate MobileCLIP profile when the label set is
              application-defined. Build a representative labeled evaluation
              set, measure per-category precision and recall, and move to a
              fine-tuned compact model only when the observed volume or latency
              requirements justify it.
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
            </div>
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
              Receives loading, ready, running, result, and error events.
              Returns an unsubscribe function.
            </p>
            <h3>
              <code>warmup()</code> · <code>setModel(id)</code> ·{' '}
              <code>destroy()</code>
            </h3>
            <p>
              Warm up during an idle product moment, change profiles between
              tasks, and always destroy the instance when its owner is removed.
            </p>
          </section>

          <section id="production">
            <p className="docs-kicker">Operations</p>
            <h2>Production guide</h2>
            <div className="checklist">
              {[
                'Build an evaluation set from representative inputs.',
                'Set category-specific quality and confidence thresholds.',
                'Provide a visible correction or deterministic fallback.',
                'Version model files and invalidate caches deliberately.',
                'Track latency and outcomes only with explicit application telemetry outside Leanlet.',
                'Test low-memory mobile devices and browser tab suspension.',
                'Publish model provenance, license, and intended-use notes.',
                'Keep Content Security Policy worker-src and connect-src rules explicit.',
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
              Leanlet’s framework code is Apache-2.0 licensed. Model weights retain
              their upstream licenses and notices. Review{' '}
              <code>MODEL_LICENSES.md</code> before redistributing model assets.
            </p>
            <div className="docs-links">
              <a
                href="https://www.npmjs.com/package/@sukumar09/leanlet"
                target="_blank"
                rel="noreferrer"
              >
                <NpmMark /> @sukumar09/leanlet on npm
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
          {sections.slice(0, 9).map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
        </aside>
      </div>
    </main>
  );
}
